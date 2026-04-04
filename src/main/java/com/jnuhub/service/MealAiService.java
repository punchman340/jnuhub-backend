package com.jnuhub.service;

import com.jnuhub.domain.meal.constant.MealAiQuestionType;
import com.jnuhub.infra.gemini.GeminiClient;
import com.jnuhub.model.MealAiAnswer;
import com.jnuhub.model.MealPlan;
import com.jnuhub.model.Restaurant;
import com.jnuhub.repository.MealAiAnswerRepository;
import com.jnuhub.repository.MealPlanRepository;
import com.jnuhub.repository.RestaurantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
public class MealAiService {

    private final RestaurantRepository    restaurantRepository;
    private final MealPlanRepository      mealPlanRepository;
    private final MealAiAnswerRepository  mealAiAnswerRepository;
    private final GeminiClient            geminiClient;
    private final TransactionTemplate     readTx;
    private final TransactionTemplate     writeTx;

    public MealAiService(
            RestaurantRepository restaurantRepository,
            MealPlanRepository mealPlanRepository,
            MealAiAnswerRepository mealAiAnswerRepository,
            GeminiClient geminiClient,
            PlatformTransactionManager transactionManager) {
        this.restaurantRepository   = restaurantRepository;
        this.mealPlanRepository     = mealPlanRepository;
        this.mealAiAnswerRepository = mealAiAnswerRepository;
        this.geminiClient           = geminiClient;
        this.readTx = createReadOnlyTemplate(transactionManager);
        this.writeTx = new TransactionTemplate(transactionManager);
    }

    private static TransactionTemplate createReadOnlyTemplate(PlatformTransactionManager tm) {
        TransactionTemplate t = new TransactionTemplate(tm);
        t.setReadOnly(true);
        return t;
    }

    // ──────────────────────────────────────────
    // 스케줄러에서 호출 - 매일 답변 미리 생성 & 캐싱
    // (Gemini 호출은 트랜잭션 밖에서 수행 → 커넥션 점유·타임아웃 방지)
    // ──────────────────────────────────────────
    public void generateAndCacheAnswers(LocalDate date) {
        for (MealAiQuestionType type : MealAiQuestionType.values()) {
            try {
                String prompt = readTx.execute(status -> buildPromptForType(date, type));
                if (prompt == null) {
                    log.warn("[MealAi] {} {} 식단 데이터 없음, 스킵", date, type);
                    continue;
                }

                String raw    = geminiClient.generate(prompt);
                String answer = truncateByCodePoints(raw, 40);
                log.info("[Gemini Raw Response] {}", raw);

                writeTx.executeWithoutResult(status -> upsertAnswer(date, type, answer));
                log.info("[MealAi] {} {} 캐싱 완료: {}", date, type, answer);

            } catch (Exception e) {
                log.error("[MealAi] {} {} 생성 실패: {}", date, type, e.getMessage(), e);
            }
        }
    }

    // ──────────────────────────────────────────
    // 프론트 요청 - 오늘 날짜 답변 전체 반환
    // ──────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<MealAiAnswer> getAnswers(LocalDate date) {
        return mealAiAnswerRepository.findByMealDate(date);
    }

    /** 읽기 전용 트랜잭션 안에서만 호출: 식단 로드 + 프롬프트 조립 */
    private String buildPromptForType(LocalDate date, MealAiQuestionType type) {
        String context = buildContext(date, type);
        if (context == null) {
            return null;
        }
        return buildPrompt(context, type);
    }

    // ──────────────────────────────────────────
    // Context 빌더
    // ──────────────────────────────────────────
    private String buildContext(LocalDate date, MealAiQuestionType type) {
        return switch (type) {
            case BEST_CAMPUS -> buildCampusContext(date);
            case BEST_DORM   -> buildDormContext(date);
        };
    }

    /**
     * 본캠 교내식당 중식 컨텍스트
     * 비교 대상: 제1학생 일품, 제1학생 한식, 제2학생 중식, 햇들마루 중식
     */
    private String buildCampusContext(LocalDate date) {
        List<Restaurant> restaurants = restaurantRepository
                .findByCampusAndCategory("GWANGJU", "CAMPUS");

        // "본캠" 질문에서는 제1/제2/햇들만 포함하고, 학동(명학회관)은 제외한다.
        // DB를 다시 쪼개지 않아도, 추천 대상만 안정적으로 제한할 수 있음.
        Set<String> allowed = Set.of("제1학생마루", "제2학생마루", "햇들마루");
        List<Restaurant> targets = restaurants.stream()
                .filter(r -> allowed.contains(r.getName()))
                .toList();

        if (targets.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("[본캠 교내식당 오늘 중식 메뉴] (모두 5,500원)\n");

        boolean hasData = false;
        for (Restaurant r : targets) {
            // mealType = "중식" 인 것만 필터
            List<MealPlan> plans = mealPlanRepository
                    .findByRestaurantIdAndMealDateAndMealType(r.getId(), date, "LUNCH");

            if (plans.isEmpty()) continue;
            hasData = true;

            for (MealPlan p : plans) {
                String subLabel = (p.getSubType() != null && !p.getSubType().isBlank())
                        ? " [" + p.getSubType() + "]" : "";
                String menus = String.join(", ", p.getMenuItemsAsList());
                sb.append(String.format("- %s%s: %s\n", r.getName(), subLabel, menus));
            }
        }

        return hasData ? sb.toString() : null;
    }

    /**
     * 본캠 기숙사 전체 식단 컨텍스트
     * 비교 대상: 조식, 중식 A/B, 석식 A/B
     */
    private String buildDormContext(LocalDate date) {
        List<Restaurant> dorms = restaurantRepository
                .findByCampusAndCategory("GWANGJU", "DORM");

        if (dorms.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("[본캠 기숙사 오늘 식단] (선결제 포함)\n");

        boolean hasData = false;
        for (Restaurant r : dorms) {
            List<MealPlan> plans = mealPlanRepository
                    .findByRestaurantIdAndMealDate(r.getId(), date);

            if (plans.isEmpty()) continue;
            hasData = true;

            for (MealPlan p : plans) {
                String subLabel = (p.getSubType() != null && !p.getSubType().isBlank())
                        ? " " + p.getSubType() : "";
                String menus = String.join(", ", p.getMenuItemsAsList());
                sb.append(String.format("- %s%s: %s\n",
                        p.getMealType(), subLabel, menus));
            }
        }

        return hasData ? sb.toString() : null;
    }

    // ──────────────────────────────────────────
    // 프롬프트 빌더
    // ──────────────────────────────────────────
    private String buildPrompt(String context, MealAiQuestionType type) {
        String question = switch (type) {
            case BEST_CAMPUS ->
                    "오늘 본캠 교내식당 중식 중 가장 야무진 [식당]은? (예: 제1학생 한식, 햇들마루";
            case BEST_DORM ->
                    "오늘 본캠 기숙사 식단 중 가장 야무진 [식사타입]은? (예: 조식, 중식 A, 중식 B, 석식 A)";
        };
        return "다음 질문에 한국어로 딱 한 줄만 답해.\n"
                + "형식은 반드시 이것만: [이름]. [한 줄 이유]\n"
                + "절대 설명, 번호, 마크다운, 추가 문장 없이 한 줄만.\n"
                + "원하는 선호 식단: 고기가 들어간다면 일단 우선순위에"
                + "예시1: 제1학생 한식. 소울푸드 제육입니다.\n"
                + "예시2: 석식 B. 돈까스는 꼭 먹어야합니다.\n"
                + "전체 35자 이내.\n\n"
                + "[식단 데이터]\n"
                + context
                + "\n질문: " + question
                + "\n답변:";
    }

    // ──────────────────────────────────────────
    // 유틸
    // ──────────────────────────────────────────

    /** Gemini가 길게 쓰면 UTF-16 서로게이트 안 깨지게 코드 포인트 단위로 자름 */
    private String truncateByCodePoints(String text, int maxCodePoints) {
        if (text == null) {
            return "";
        }
        String trimmed = text.strip();
        if (trimmed.codePointCount(0, trimmed.length()) <= maxCodePoints) {
            return trimmed;
        }
        int end = trimmed.offsetByCodePoints(0, maxCodePoints - 1);
        return trimmed.substring(0, end) + "…";
    }

    /** 날짜+타입으로 이미 있으면 update, 없으면 insert */
    private void upsertAnswer(LocalDate date, MealAiQuestionType type, String answer) {
        Optional<MealAiAnswer> existing =
                mealAiAnswerRepository.findByMealDateAndQuestionType(date, type);

        if (existing.isPresent()) {
            existing.get().updateAnswer(answer);
        } else {
            mealAiAnswerRepository.save(
                    MealAiAnswer.builder()
                            .mealDate(date)
                            .questionType(type)
                            .answer(answer)
                            .build()
            );
        }
    }
}
