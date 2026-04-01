package com.jnuhub.repository;

import com.jnuhub.domain.meal.constant.MealAiQuestionType;
import com.jnuhub.model.MealAiAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealAiAnswerRepository extends JpaRepository<MealAiAnswer, Long> {

    // 특정 날짜의 전체 답변 조회 (프론트 요청 시)
    List<MealAiAnswer> findByMealDate(LocalDate mealDate);

    // 특정 날짜 + 질문타입으로 단건 조회 (upsert용)
    Optional<MealAiAnswer> findByMealDateAndQuestionType(
            LocalDate mealDate, MealAiQuestionType questionType
    );

    // 특정 날짜에 이미 생성됐는지 확인 (스케줄러 중복 방지)
    boolean existsByMealDate(LocalDate mealDate);
}
