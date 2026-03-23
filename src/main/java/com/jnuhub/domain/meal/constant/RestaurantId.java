package com.jnuhub.domain.meal.constant;

import java.util.Arrays;
import java.util.Optional;

public enum RestaurantId {

    // ── 용봉캠퍼스 (today.jnu.ac.kr) ──────────────────
    JNU_STUDENT_1_BREAKFAST     (1,  "제1학생마루", "조식",      MealType.BREAKFAST),
    JNU_STUDENT_1_LUNCH_KOREAN  (2,  "제1학생마루", "중식-한식",  MealType.LUNCH),
    JNU_STUDENT_1_LUNCH_ILPUM   (3,  "제1학생마루", "중식-일품",  MealType.LUNCH_ILPUM),
    JNU_STUDENT_1_DINNER        (4,  "제1학생마루", "석식",      MealType.DINNER),

    JNU_HAETDEUL_BREAKFAST      (5,  "햇들마루",    "조식",      MealType.BREAKFAST),
    JNU_HAETDEUL_LUNCH          (6,  "햇들마루",    "중식",      MealType.LUNCH),
    JNU_HAETDEUL_DINNER         (7,  "햇들마루",    "석식",      MealType.DINNER),

    JNU_STUDENT_2_LUNCH         (8,  "제2학생마루", "중식",      MealType.LUNCH),

    JNU_HAKDONG_LUNCH           (9,  "명학회관",    "중식",      MealType.LUNCH),

    JNU_YEOSU_STUDENT_BREAKFAST (10, "여수-학생회관", "조식",     MealType.BREAKFAST),
    JNU_YEOSU_STUDENT_LUNCH     (11, "여수-학생회관", "중식",     MealType.LUNCH),
    JNU_YEOSU_STUDENT_DINNER    (12, "여수-학생회관", "석식",     MealType.DINNER),

    JNU_HWASUN_BREAKFAST        (13, "화순-여미샘", "조식",      MealType.BREAKFAST),
    JNU_HWASUN_LUNCH            (14, "화순-여미샘", "중식",      MealType.LUNCH),
    JNU_HWASUN_DINNER           (15, "화순-여미샘", "석식",      MealType.DINNER),

    // ── 광주생활관 (dormitory.jnu.ac.kr) ──────────────
    DORM_GWANGJU_BREAKFAST      (20, "광주생활관",  "아침",      MealType.BREAKFAST),
    DORM_GWANGJU_LUNCH_A        (21, "광주생활관",  "점심-A",    MealType.LUNCH_A),
    DORM_GWANGJU_LUNCH_B        (22, "광주생활관",  "점심-B",    MealType.LUNCH_B),
    DORM_GWANGJU_DINNER_A       (23, "광주생활관",  "저녁-A",    MealType.DINNER_A),
    DORM_GWANGJU_DINNER_B       (24, "광주생활관",  "저녁-B",    MealType.DINNER_B),

    // ── 여수생활관 (house.jnu.ac.kr) ──────────────────
    DORM_YEOSU_BREAKFAST        (30, "여수생활관",  "아침",      MealType.BREAKFAST),
    DORM_YEOSU_LUNCH            (31, "여수생활관",  "점심",      MealType.LUNCH),
    DORM_YEOSU_DINNER           (32, "여수생활관",  "저녁",      MealType.DINNER);

    private final int id;
    private final String restaurantName;
    private final String mealTypeName;
    private final MealType mealType;         // ← MealType을 enum 안에 보유

    RestaurantId(int id, String restaurantName, String mealTypeName, MealType mealType) {
        this.id             = id;
        this.restaurantName = restaurantName;
        this.mealTypeName   = mealTypeName;
        this.mealType       = mealType;
    }

    public int getId()                  { return id; }
    public String getRestaurantName()   { return restaurantName; }
    public String getMealTypeName()     { return mealTypeName; }
    public MealType getMealType()       { return mealType; }   // ← resolveMealType() 불필요해짐

    public static Optional<RestaurantId> findById(int id) {
        return Arrays.stream(values()).filter(r -> r.id == id).findFirst();
    }
}
