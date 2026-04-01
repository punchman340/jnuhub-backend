package com.jnuhub.model;

import com.jnuhub.domain.meal.constant.MealAiQuestionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "meal_ai_answer",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"meal_date", "question_type"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealAiAnswer extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate mealDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    private MealAiQuestionType questionType;

    // 40자 이내로 Gemini가 생성, DB엔 여유있게 100자
    @Column(nullable = false, length = 100)
    private String answer;

    @Builder
    public MealAiAnswer(LocalDate mealDate,
                        MealAiQuestionType questionType,
                        String answer) {
        this.mealDate     = mealDate;
        this.questionType = questionType;
        this.answer       = answer;
    }

    public void updateAnswer(String answer) {
        this.answer = answer;
    }
}
