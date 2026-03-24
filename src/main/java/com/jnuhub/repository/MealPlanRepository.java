package com.jnuhub.repository;

import com.jnuhub.model.MealPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {
    // 특정 식단/날짜 전체 식단 조회
    @Query("SELECT m FROM MealPlan m JOIN FETCH m.restaurant " +
            "WHERE m.restaurant.id = :restaurantId AND m.mealDate = :mealDate")
    List<MealPlan> findByRestaurantIdAndMealDate(
            @Param("restaurantId") Long restaurantId, @Param("mealDate") LocalDate mealDate);
    // 특정 끼니 필터링 조회
    List<MealPlan> findByRestaurantIdAndMealDateAndMealType(
            Long restaurantId, LocalDate mealDate, String mealType);
    // 크롤링 중복 저장 방지 체크
    boolean existsByRestaurantIdAndMealDateAndMealTypeAndSubType(
            Long restaurantId, LocalDate mealDate,
            String mealType, String subType);
    // Upsert 시 기존 엔티티로 가져와서 updateMenuItems() 호출
    Optional<MealPlan> findByRestaurantIdAndMealDateAndMealTypeAndSubType(
            Long restaurantId, LocalDate mealDate, String mealType, String subType);
    //주간 식단 일괄 조회
    @Query("""
            SELECT m FROM MealPlan m\s
            JOIN FETCH m.restaurant
            WHERE m.restaurant.id = :restaurantId
            AND m.mealDate BETWEEN :from AND :to
            ORDER BY m.mealDate, m.mealType, m.subType
            """)
    List<MealPlan> findWeeklyMealPlan(
            @Param("restaurantId") Long restaurantId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
