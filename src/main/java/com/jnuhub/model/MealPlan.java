package com.jnuhub.model;

import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
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
    private String mealType;    // BREAKFAST | LUNCH | DINNER

    @Column(length = 20)
    private String subType;     // KOREAN | SPECIAL | TYPE_A | TYPE_B

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> menuItems = new ArrayList<>();

    // 신선도는 CrawlMeta 가 관리 → crawledAt 없음

    @Builder
    public MealPlan(Restaurant restaurant, LocalDate mealDate,
                    String mealType, String subType, List<String> menuItems) {
        this.restaurant = restaurant;
        this.mealDate   = mealDate;
        this.mealType   = mealType;
        this.subType    = subType;
        this.menuItems  = menuItems != null ? menuItems : new ArrayList<>();
    }
    public void updateMenuItems(List<String> menuItems) {
        this.menuItems.clear();
        this.menuItems.addAll(menuItems);
    }
}
