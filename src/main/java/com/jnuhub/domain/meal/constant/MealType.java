package com.jnuhub.domain.meal.constant;

public enum MealType {
    BREAKFAST,          // 조식 / 아침
    LUNCH,              // 중식 (한식)
    LUNCH_ILPUM,        // 중식 (일품) - 제1학생마루 전용
    LUNCH_A,            // 점심 Corner A - 광주생활관
    LUNCH_B,            // 점심 Corner B - 광주생활관
    DINNER,             // 석식 / 저녁
    DINNER_A,           // 저녁 Corner A - 광주생활관
    DINNER_B;           // 저녁 Corner B - 광주생활관

    /**
     * today.jnu.ac.kr의 섹션 헤더 텍스트에서 MealType으로 변환
     */
    public static MealType fromSectionHeader(String header) {
        String h = header.trim();
        if (h.contains("조식") || h.contains("아침")) return BREAKFAST;
        if (h.contains("일품")) return LUNCH_ILPUM;
        if (h.contains("중식") || h.contains("점심")) return LUNCH;
        if (h.contains("석식") || h.contains("저녁")) return DINNER;
        return LUNCH; // fallback
    }
}
