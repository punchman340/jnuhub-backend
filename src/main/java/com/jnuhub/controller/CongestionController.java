package com.jnuhub.controller;

import com.jnuhub.model.CongestionLog;
import com.jnuhub.service.CongestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/congestion")
@RequiredArgsConstructor
public class CongestionController {
    private final CongestionService congestionService;

    // GET /api/congestion/latest?restaurantId=1
    @GetMapping("/latest")
    public ResponseEntity<CongestionLog> getLatest(
            @RequestParam Long restaurantId
    ) {
        return congestionService.getLatestCongestion(restaurantId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build()); // 데이터 없으면 204
    }

    // GET /api/congestion/trend?restaurantId=1&hours=3
    @GetMapping("/trend")
    public ResponseEntity<List<CongestionLog>> getTrend(
            @RequestParam Long restaurantId,
            @RequestParam(defaultValue = "3") int hours  // 기본값 3시간
    ) {
        return ResponseEntity.ok(
                congestionService.getRecentTrend(restaurantId, hours)
        );
    }
}
