package com.jnuhub.dto.meal;

import com.jnuhub.model.MealPlan;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class MealResponseDto {

    private Long id;
    private String restaurantName;
    private LocalDate mealDate;
    private String mealType;   // BREAKFAST | LUNCH | DINNER
    private String subType;    // KOREAN | SPECIAL | TYPE_A | TYPE_B | null
    private List<String> menuItems;

    // Entity -> DTO 변환
    // from 메서드 내부 수정 예시
    public static MealResponseDto from(MealPlan mealPlan) {
        return new MealResponseDto(
                mealPlan.getId(),
                mealPlan.getRestaurant().getName(),
                mealPlan.getMealDate(),
                mealPlan.getMealType(),
                mealPlan.getSubType(),
                mealPlan.getMenuItemsAsList()
        );
    }
}
