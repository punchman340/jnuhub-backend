package com.jnuhub.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "meal_plan",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"restaurant_id", "meal_date", "meal_type", "sub_type"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false)
    private LocalDate mealDate;

    @Column(nullable = false, length = 20)
    private String mealType;

    @Column(length = 20)
    private String subType;

    // 🚨 핵심 수정: List 대신 String[] 사용
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] menuItems = new String[0];

    @Builder
    public MealPlan(Restaurant restaurant, LocalDate mealDate,
                    String mealType, String subType, List<String> menuItems) {
        this.restaurant = restaurant;
        this.mealDate   = mealDate;
        this.mealType   = mealType;
        this.subType    = subType;
        updateMenuItems(menuItems);
    }

    public void updateMenuItems(List<String> menuItems) {
        this.menuItems = (menuItems != null && !menuItems.isEmpty())
                ? menuItems.toArray(new String[0])
                : new String[0];
    }

    // DTO에서 편하게 쓰기 위한 변환 메서드
    public List<String> getMenuItemsAsList() {
        return this.menuItems != null ? Arrays.asList(this.menuItems) : Collections.emptyList();
    }
}