package com.jnuhub.dto.meal;

import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
public class MealRequestDto {

    // 날짜 필터 (없으면 오늘)
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate date;

    // 식당 이름 필터 (없으면 전체)
    private String restaurantName;

    // 끼니 필터 (BREAKFAST | LUNCH | DINNER, 없으면 전체)
    private String mealType;

    // 날짜 없으면 오늘로 기본값 설정
    public LocalDate getDateOrToday() {
        return date != null ? date : LocalDate.now();
    }
}
