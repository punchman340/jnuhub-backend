package com.jnuhub.controller;

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

    // GET /api/meals/daily?restaurantId=i&date=yyyy-mm-dd
    @GetMapping("/daily")
    public ResponseEntity<MealDailyResult> getDailyMeal(
            @RequestParam Long restaurantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(mealService.getDailyMeal(restaurantId, date));
    }

    // GET /api/meals/weekly?restaurantId=i&from=yyyy-mm-dd&to=yyyy-mm-dd
    @GetMapping("/weekly")
    public ResponseEntity<List<MealWeeklyResult>> getWeeklyMeal(
            @RequestParam Long restaurantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(mealService.getWeeklyMeal(restaurantId, from, to));
    }
}
