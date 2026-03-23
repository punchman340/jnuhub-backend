package com.jnuhub.crawler;

import com.jnuhub.model.CrawlMeta;
import com.jnuhub.model.MealPlan;
import com.jnuhub.model.Restaurant;
import com.jnuhub.repository.CrawlMetaRepository;
import com.jnuhub.repository.MealPlanRepository;
import com.jnuhub.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class JnuMealCrawler {

    private final MealPlanRepository   mealPlanRepository;
    private final CrawlMetaRepository  crawlMetaRepository;
    private final RestaurantRepository restaurantRepository;

    private static final String TODAY_URL      = "https://today.jnu.ac.kr/Program/MealPlan.aspx";
    private static final String DORMITORY_URL  = "https://dormitory.jnu.ac.kr/Board/Board.aspx?BoardID=2";
    private static final String YEOSU_DORM_URL = "https://house.jnu.ac.kr/Board/Board.aspx?BoardID=36";

    // ── 섹션 매핑 레코드 ──────────────────────────────────────
    // restaurantKeyword : h5 텍스트에 포함될 식당명 키워드
    // mealKeyword       : 섹션 헤더 텍스트에 포함될 끼니 키워드
    // restaurantName    : Restaurant 테이블의 name 컬럼값 (DB 조회 키)
    // mealType          : "BREAKFAST" | "LUNCH" | "DINNER"
    // subType           : "KOREAN" | "SPECIAL" | null
    private record SectionMapping(
            String restaurantKeyword,
            String mealKeyword,
            String restaurantName,
            String mealType,
            String subType
    ) {}

    // "일품" 체크가 "중식" 체크보다 앞에 와야 오분류 방지
    private static final List<SectionMapping> TODAY_MAPPINGS = List.of(
            new SectionMapping("제1학생마루", "일품",  "제1학생마루", "LUNCH",     "SPECIAL"),
            new SectionMapping("제1학생마루", "중식",  "제1학생마루", "LUNCH",     "KOREAN"),
            new SectionMapping("제1학생마루", "조식",  "제1학생마루", "BREAKFAST", null),
            new SectionMapping("제1학생마루", "석식",  "제1학생마루", "DINNER",    null),
            new SectionMapping("햇들마루",    "조식",  "햇들마루",    "BREAKFAST", null),
            new SectionMapping("햇들마루",    "중식",  "햇들마루",    "LUNCH",     null),
            new SectionMapping("햇들마루",    "석식",  "햇들마루",    "DINNER",    null),
            new SectionMapping("제2학생마루", "중식",  "제2학생마루", "LUNCH",     null),
            new SectionMapping("명학회관",    "중식",  "학동-명학회관",    "LUNCH",     null),
            new SectionMapping("학생회관",    "조식",  "여수-학생회관","BREAKFAST", null),
            new SectionMapping("학생회관",    "중식",  "여수-학생회관","LUNCH",     null),
            new SectionMapping("학생회관",    "석식",  "여수-학생회관","DINNER",    null),
            new SectionMapping("여미샘",      "조식",  "화순-여미샘",      "BREAKFAST", null),
            new SectionMapping("여미샘",      "중식",  "화순-여미샘",      "LUNCH",     null),
            new SectionMapping("여미샘",      "석식",  "화순-여미샘",      "DINNER",    null)
    );

    // ── 생활관 행 매핑 레코드 ─────────────────────────────────
    private record DormRowMapping(
            String rowPattern,      // 정규식: "구분" 셀 텍스트 매칭
            String restaurantName,  // Restaurant.name
            String mealType,
            String subType
    ) {}

    private static final List<DormRowMapping> DORMITORY_MAPPINGS = List.of(
            new DormRowMapping("아침",     "광주생활관", "BREAKFAST", null),
            new DormRowMapping("점심.*A",  "광주생활관", "LUNCH",     "TYPE_A"),
            new DormRowMapping("점심.*B",  "광주생활관", "LUNCH",     "TYPE_B"),
            new DormRowMapping("저녁.*A",  "광주생활관", "DINNER",    "TYPE_A"),
            new DormRowMapping("저녁.*B",  "광주생활관", "DINNER",    "TYPE_B")
    );

    private static final List<DormRowMapping> YEOSU_DORM_MAPPINGS = List.of(
            new DormRowMapping("아침", "여수생활관", "BREAKFAST", null),
            new DormRowMapping("점심", "여수생활관", "LUNCH",     null),
            new DormRowMapping("저녁", "여수생활관", "DINNER",    null)
    );

    // ════════════════════════════════════════════════════════════
    //  진입점
    // ════════════════════════════════════════════════════════════
    @Transactional
    public void crawlAll() {
        crawlTodayJnu();
        crawlDormitory();
        crawlYeosuDorm();
    }

    // ════════════════════════════════════════════════════════════
    //  1. today.jnu.ac.kr
    // ════════════════════════════════════════════════════════════
    @Transactional
    public void crawlTodayJnu() {
        Document doc = fetchDocument(TODAY_URL);
        if (doc == null) return;

        int year = LocalDate.now().getYear();

        for (Element h5 : doc.select("h5")) {
            String restaurantHeader = h5.text();
            Element sibling         = h5.nextElementSibling();
            String  currentSection  = null;

            while (sibling != null && !sibling.tagName().equals("h5")) {
                String sibText = sibling.text();

                if (isMealSectionHeader(sibText)
                        && !sibling.tagName().equals("table")) {
                    currentSection = sibText;
                }

                Element table = sibling.selectFirst("table");
                // 수정
                if (table != null && currentSection != null) {
                    SectionMapping mapping = resolveToday(restaurantHeader, currentSection);
                    if (mapping != null) {
                        Restaurant restaurant = findRestaurant(mapping.restaurantName());
                        if (restaurant != null) {
                            try {
                                parseTodayTable(table, restaurant, mapping, year);
                            } catch (Exception e) {
                                log.error("[크롤러] {} 파싱 실패: {}", restaurant.getName(), e.getMessage());
                                saveFailMeta(restaurant, LocalDate.now());
                            }
                        }
                    }
                }

                sibling = sibling.nextElementSibling();
            }
        }
    }

    private void saveFailMeta(Restaurant restaurant, LocalDate date) {
        CrawlMeta meta = crawlMetaRepository
                .findByRestaurantIdAndTargetDate(restaurant.getId(), date)
                .orElseGet(() -> CrawlMeta.builder()
                        .restaurant(restaurant)
                        .targetDate(date)
                        .status("FAIL")
                        .errorMessage("파싱 예외 발생")
                        .build());
        meta.updateResult("FAIL", "파싱 예외 발생");
        crawlMetaRepository.save(meta);
    }


    /**
     * today.jnu.ac.kr 3컬럼 테이블 파싱
     * | 03-23 (월) | 한식 | 돈까스, 김치찌개, ... |
     * → menuItems: ["돈까스", "김치찌개", ...]  (쉼표 분리)
     */
    private void parseTodayTable(Element table, Restaurant restaurant,
                                 SectionMapping mapping, int year) {

        for (Element row : table.select("tr")) {
            LocalDate date = null; // catch 블록에서도 쓰기 위해 밖으로 선언
            try {
                Elements cols = row.select("td");
                if (cols.size() < 3) continue;

                String dateStr = cols.get(0).text().trim();
                String content = cols.get(2).text().trim();

                if (dateStr.contains("등록된") || dateStr.isBlank()) continue;

                date = parseTodayDate(dateStr, year); // 날짜 추출
                if (date == null) continue;

                List<String> menuItems = splitMenuItems(content);
                upsertMealPlan(restaurant, date, mapping.mealType(), mapping.subType(), menuItems);

            } catch (Exception e) {
                log.error("[크롤러] {} 행 파싱 실패: {}", restaurant.getName(), e.getMessage());
                // 추출된 date가 있으면 그 날짜를 쓰고, 없으면(날짜 파싱 전 에러면) 오늘 날짜 사용
                saveFailMeta(restaurant, (date != null) ? date : LocalDate.now());
            }
        }
    }

    // ════════════════════════════════════════════════════════════
    //  2. dormitory.jnu.ac.kr (광주생활관)
    // ════════════════════════════════════════════════════════════
    @Transactional
    public void crawlDormitory() {
        Document doc = fetchDocument(DORMITORY_URL);
        if (doc == null) return;
        parseDormTable(doc, DORMITORY_MAPPINGS);
    }

    // ════════════════════════════════════════════════════════════
    //  3. house.jnu.ac.kr (여수생활관)
    // ════════════════════════════════════════════════════════════
    @Transactional
    public void crawlYeosuDorm() {
        Document doc = fetchDocument(YEOSU_DORM_URL);
        if (doc == null) return;
        parseDormTable(doc, YEOSU_DORM_MAPPINGS);
    }

    // ════════════════════════════════════════════════════════════
    //  생활관 공통 주간 테이블 파싱
    // ════════════════════════════════════════════════════════════
    private void parseDormTable(Document doc, List<DormRowMapping> mappings) {
        Element targetTable = null;
        for (Element table : doc.select("table")) {
            Element firstTh = table.selectFirst("th");
            if (firstTh != null && firstTh.text().trim().equals("구분")) {
                targetTable = table;
                break;
            }
        }
        if (targetTable == null) {
            log.warn("[크롤러] 생활관 식단 테이블을 찾지 못했습니다.");
            return;
        }

        Elements rows = targetTable.select("tr");
        if (rows.isEmpty()) return;

        List<LocalDate> dates = parseDormHeaderDates(rows.first());
        if (dates.isEmpty()) {
            log.warn("[크롤러] 생활관 날짜 파싱 실패");
            return;
        }

        for (int i = 1; i < rows.size(); i++) {
            Elements cells = rows.get(i).select("td, th");
            if (cells.isEmpty()) continue;

            String rowKey = cells.get(0).text().trim();
            DormRowMapping mapping = resolveDorm(mappings, rowKey);
            if (mapping == null) continue;

            Restaurant restaurant = findRestaurant(mapping.restaurantName());
            if (restaurant == null) continue;

            // 수정
            for (int d = 0; d < dates.size(); d++) {
                int cellIdx = d + 1;
                if (cellIdx >= cells.size()) break;

                String content = cells.get(cellIdx).text().trim();
                if (content.isBlank() || content.equals("운영안함")) continue;

                try {
                    List<String> menuItems = splitMenuItems(content);
                    upsertMealPlan(restaurant, dates.get(d), mapping.mealType(), mapping.subType(), menuItems);
                } catch (Exception e) {
                    log.error("[크롤러] {} {} 파싱 실패: {}", restaurant.getName(), dates.get(d), e.getMessage());
                    saveFailMeta(restaurant, dates.get(d));
                }
            }

        }
    }

    // ════════════════════════════════════════════════════════════
    //  Upsert & CrawlMeta
    // ════════════════════════════════════════════════════════════

    private void upsertMealPlan(Restaurant restaurant, LocalDate date,
                                String mealType, String subType, List<String> menuItems) {
        mealPlanRepository
                .findByRestaurantIdAndMealDateAndMealTypeAndSubType(
                        restaurant.getId(), date, mealType, subType)
                .ifPresentOrElse(
                        existing -> { existing.updateMenuItems(menuItems); },
                        () -> mealPlanRepository.save(
                                MealPlan.builder()
                                        .restaurant(restaurant)
                                        .mealDate(date)
                                        .mealType(mealType)
                                        .subType(subType)
                                        .menuItems(menuItems)
                                        .build()
                        )
                );
        CrawlMeta meta = crawlMetaRepository
                .findByRestaurantIdAndTargetDate(restaurant.getId(), date)
                .orElseGet(() -> CrawlMeta.builder()
                        .restaurant(restaurant)
                        .targetDate(date)
                        .status("SUCCESS")
                        .errorMessage(null)
                        .build());
        meta.updateResult("SUCCESS", null);
        crawlMetaRepository.save(meta);
    }

    private Restaurant findRestaurant(String name) {
        return restaurantRepository.findByName(name)
                .orElseGet(() -> {
                    log.warn("[크롤러] Restaurant 없음: '{}'", name);
                    return null;
                });
    }

    // ════════════════════════════════════════════════════════════
    //  유틸리티
    // ════════════════════════════════════════════════════════════

    private Document fetchDocument(String url) {
        try {
            Document doc = Jsoup.connect(url).timeout(10_000).get();
            doc.select("br").append(",");
            return doc;
        } catch (IOException e) {
            log.error("[크롤러] 연결 실패 url={} msg={}", url, e.getMessage());
            return null;
        }
    }

    private SectionMapping resolveToday(String restaurantHeader, String sectionText) {
        for (SectionMapping m : TODAY_MAPPINGS) {
            if (restaurantHeader.contains(m.restaurantKeyword())
                    && sectionText.contains(m.mealKeyword())) {
                return m;
            }
        }
        log.debug("[크롤러] today 매핑 실패 - 식당:'{}' 섹션:'{}'", restaurantHeader, sectionText);
        return null;
    }

    private DormRowMapping resolveDorm(List<DormRowMapping> mappings, String rowKey) {
        for (DormRowMapping m : mappings) {
            if (rowKey.matches("(?s).*" + m.rowPattern() + ".*")) return m;
        }
        return null;
    }

    private List<LocalDate> parseDormHeaderDates(Element headerRow) {
        List<LocalDate> dates = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy.MM.dd.");
        Pattern pattern       = Pattern.compile("(\\d{4}\\.\\d{2}\\.\\d{2}\\.)");

        Elements cells = headerRow.select("th, td");
        for (int i = 1; i < cells.size(); i++) {
            Matcher m = pattern.matcher(cells.get(i).text());
            if (m.find()) {
                try {
                    dates.add(LocalDate.parse(m.group(1), fmt));
                } catch (Exception e) {
                    log.warn("[크롤러] 헤더 날짜 파싱 실패: '{}'", cells.get(i).text());
                }
            }
        }
        return dates;
    }

    private LocalDate parseTodayDate(String dateStr, int year) {
        try {
            String mmdd = dateStr.split("\\s")[0]; // "03-23"
            int month = Integer.parseInt(mmdd.split("-")[0]);
            if (LocalDate.now().getMonthValue() == 12 && month == 1) year++;
            return LocalDate.parse(year + "-" + mmdd, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (Exception e) {
            log.warn("[크롤러] 날짜 파싱 실패: '{}'", dateStr);
            return null;
        }
    }

    /**
     * "돈까스, 김치찌개, 흰쌀밥" → ["돈까스", "김치찌개", "흰쌀밥"]
     * 생활관은 쉼표 대신 공백/줄바꿈 구분이므로 쉼표 우선, 없으면 그대로 단일 항목
     */
    private List<String> splitMenuItems(String content) {
        if (content.contains(",")) {
            return Arrays.stream(content.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();
        }
        return List.of(content.trim());
    }

    private boolean isMealSectionHeader(String text) {
        return text.contains("조식") || text.contains("중식") || text.contains("석식");
    }
}
