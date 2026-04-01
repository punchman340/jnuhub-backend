package com.jnuhub.service;

import com.jnuhub.domain.meal.constant.MealAiQuestionType;
import com.jnuhub.infra.gemini.GeminiClient;
import com.jnuhub.model.MealAiAnswer;
import com.jnuhub.model.MealPlan;
import com.jnuhub.model.Restaurant;
import com.jnuhub.repository.MealAiAnswerRepository;
import com.jnuhub.repository.MealPlanRepository;
import com.jnuhub.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealAiService {

    private final RestaurantRepository    restaurantRepository;
    private final MealPlanRepository      mealPlanRepository;
    private final MealAiAnswerRepository  mealAiAnswerRepository;
    private final GeminiClient            geminiClient;

    // ──────────────────────────────────────────
    // 스케줄러에서 호출 - 매일 답변 미리 생성 & 캐싱
    // ──────────────────────────────────────────
    @Transactional
    public void generateAndCacheAnswers(LocalDate date) {
        if (mealAiAnswerRepository.existsByMealDate(date)) {
            log.info("[MealAi] {} 이미 캐싱 완료, 스킵", date);
            return;
        }

        for (MealAiQuestionType type : MealAiQuestionType.values()) {
            try {
                String context = buildContext(date, type);
                if (context == null) {
                    log.warn("[MealAi] {} {} 식단 데이터 없음, 스킵", date, type);
                    continue;
                }

                String prompt = buildPrompt(context, type);
                String raw    = geminiClient.generate(prompt);
                String answer = truncate(raw, 40); // 40자 초과 방지

                upsertAnswer(date, type, answer);
                log.info("[MealAi] {} {} 캐싱 완료: {}", date, type, answer);

            } catch (Exception e) {
                log.error("[MealAi] {} {} 생성 실패: {}", date, type, e.getMessage());
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

        if (restaurants.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("[본캠 교내식당 오늘 중식 메뉴] (모두 5,500원)\n");

        boolean hasData = false;
        for (Restaurant r : restaurants) {
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
                    "질문: 오늘 본캠 교내식당 중식 중 가장 야무지게 먹을 수 있는 곳은?";
            case BEST_DORM ->
                    "질문: 오늘 본캠 기숙사 식단 중 가장 야무지게 먹을 수 있는 식단은?";
        };
        return "다음 질문에 한국어로 딱 한 줄만 답해.\n"
                + "형식은 반드시 이것만: [식당명 또는 식단명]. [한 줄 이유]\n"
                + "절대 설명, 번호, 마크다운, 추가 문장 없이 한 줄만.\n"
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

    /** Gemini가 40자 넘기면 강제로 자름 (안전장치) */
    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        String trimmed = text.strip();
        return trimmed.length() <= maxLength
                ? trimmed
                : trimmed.substring(0, maxLength - 1) + "…";
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
