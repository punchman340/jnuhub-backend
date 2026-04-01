package com.jnuhub.controller;

import com.jnuhub.dto.meal.MealAiAnswerResponse;
import com.jnuhub.model.MealAiAnswer;
import com.jnuhub.service.MealAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/meal/ai-answers")
@RequiredArgsConstructor
public class MealAiController {

    private final MealAiService mealAiService;

    /**
     * GET /api/meal/ai-answers          → 오늘 답변
     * GET /api/meal/ai-answers?date=... → 특정일 답변
     */
    @GetMapping
    public ResponseEntity<List<MealAiAnswerResponse>> getAnswers(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate target = (date != null) ? date : LocalDate.now();
        List<MealAiAnswerResponse> response = mealAiService.getAnswers(target)
                .stream()
                .map(MealAiAnswerResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }
}
