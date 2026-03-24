package com.jnuhub.controller;

import com.jnuhub.dto.common.ApiResponse;
import com.jnuhub.service.MealService;
import com.jnuhub.service.MealService.MealDailyResult;
import com.jnuhub.service.MealService.MealWeeklyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;

    // GET /api/meals/daily?restaurantId=1&date=2026-03-24
    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<MealDailyResult>> getDailyMeal(
            @RequestParam Long restaurantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        MealDailyResult result = mealService.getDailyMeal(restaurantId, date);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // GET /api/meals/weekly?restaurantId=1&from=2026-03-24&to=2026-03-28
    @GetMapping("/weekly")
    public ResponseEntity<ApiResponse<List<MealWeeklyResult>>> getWeeklyMeal(
            @RequestParam Long restaurantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        List<MealWeeklyResult> result = mealService.getWeeklyMeal(restaurantId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
