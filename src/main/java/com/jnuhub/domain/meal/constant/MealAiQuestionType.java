package com.jnuhub.domain.meal.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MealAiQuestionType {

    BEST_CAMPUS("🏆 본캠 교내식당 오늘 중식 중 제일 야무진 곳은?"),
    BEST_DORM  ("🏠 본캠 기숙사 오늘 가장 야무진 식단은?");

    private final String label;
}
