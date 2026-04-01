package com.jnuhub.dto.meal;

import com.jnuhub.model.MealAiAnswer;

public record MealAiAnswerResponse(
        String questionType,   // "BEST_CAMPUS" | "BEST_DORM"
        String questionLabel,  // "🏆 본캠 교내식당 오늘 중식 중 제일 야무진 곳은?"
        String answer          // "제1학생 한식. 오늘 제육볶음으로 단백질 채우기 딱입니다."
) {
    public static MealAiAnswerResponse from(MealAiAnswer entity) {
        return new MealAiAnswerResponse(
                entity.getQuestionType().name(),
                entity.getQuestionType().getLabel(),
                entity.getAnswer()
        );
    }
}
