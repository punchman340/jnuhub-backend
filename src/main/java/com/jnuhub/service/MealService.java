package com.jnuhub.service;

import com.jnuhub.dto.meal.MealResponseDto;
import com.jnuhub.model.CrawlMeta;
import com.jnuhub.model.MealPlan;
import com.jnuhub.repository.CrawlMetaRepository;
import com.jnuhub.repository.MealPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)  // 조회 전용 → 성능 최적화
public class MealService {
    private final MealPlanRepository mealPlanRepository;
    private final CrawlMetaRepository crawlMetaRepository;
    // 특정 식당 + 날짜의 식단 전체 조회
    public MealDailyResult getDailyMeal(Long restaurantId, LocalDate date) {
        // 1. 해당 식당 + 날짜의 식단 전부 조회
        List<MealPlan> mealPlans =
                mealPlanRepository.findByRestaurantIdAndMealDate(restaurantId, date);

        // 2. MealType 기준으로 그룹핑
        Map<String, List<MealResponseDto>> groupedByMealType = mealPlans.stream()
                .map(MealResponseDto::from)
                .collect(Collectors.groupingBy(MealResponseDto::getMealType));

        // 3. 신선도 조회 (없으면 null → "정보 없음" 처리)
        LocalDateTime freshness = crawlMetaRepository
                .findByRestaurantIdAndTargetDate(restaurantId, date)
                .map(meta -> meta.getLastSucceededAt() != null
                        ? meta.getLastSucceededAt()
                        : LocalDateTime.MIN)
                .orElse(null);

        return new MealDailyResult(groupedByMealType, freshness);
    }

    // 주간 식단 조회
    // Map -> List로 순서 보장
    public List<MealWeeklyResult> getWeeklyMeal(Long restaurantId, LocalDate from, LocalDate to) {
        // 1. 식단 일주일치 한 번에 조회
        List<MealPlan> mealPlans = mealPlanRepository.findWeeklyMealPlan(restaurantId, from, to);

        // 2. [성능 개선] 신선도 일주일치 한 번에 조회해서 Map으로 변환
        // 기본 6번(식단 1번 + 신선도 5번) -> 2번(식단 1번 + 신선도 1번)
        Map<LocalDate, LocalDateTime> freshnessMap = crawlMetaRepository
                .findByRestaurantIdAndTargetDateBetween(restaurantId, from, to)
                .stream()
                .collect(Collectors.toMap(
                        CrawlMeta::getTargetDate,
                        meta -> meta.getLastSucceededAt() != null
                                ? meta.getLastSucceededAt()
                                : LocalDateTime.MIN  // 최솟값으로 수집 없음 표현 + null 방지
                ));


        // 3. 날짜별 그룹핑
        // 기본 groupingBy 순서 혼잡 방지 -> treemap 사용해 날짜 정렬
        // 추가 정렬 방지 -> sorted 삭제
        Map<LocalDate, List<MealResponseDto>> byDate = mealPlans.stream()
                .map(MealResponseDto::from)
                .collect(Collectors.groupingBy(
                        MealResponseDto::getMealDate,
                        TreeMap::new,
                        Collectors.toList()
                ));

        return byDate.entrySet().stream()
                .map(entry -> {
                    LocalDate date = entry.getKey();

                    Map<String, List<MealResponseDto>> mealsByType = entry.getValue().stream()
                            .collect(Collectors.groupingBy(MealResponseDto::getMealType));

                    LocalDateTime freshness = freshnessMap.get(date);

                    return new MealWeeklyResult(date, mealsByType, freshness);
                })
                .collect(Collectors.toList());
    }

    // getDailyMeal() 반환 타입 — 식단 + 신선도 묶음
    // record 사용 → 불변 DTO 역할
    public record MealDailyResult(
            Map<String, List<MealResponseDto>> mealsByType,
            LocalDateTime freshness   // ✅ CrawlMeta 엔티티 제거 → 시각 정보만
    ) {}
    // 주간 식단용 DTO
    public record MealWeeklyResult(
            LocalDate date,
            Map<String, List<MealResponseDto>> mealsByType,
            LocalDateTime freshness
    ) {}
}
