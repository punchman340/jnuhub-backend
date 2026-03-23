package com.jnuhub.service;

import com.jnuhub.model.CongestionLog;
import com.jnuhub.model.Restaurant;
import com.jnuhub.repository.CongestionLogRepository;
import com.jnuhub.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CongestionService {
    private final CongestionLogRepository congestionLogRepository;
    private final RestaurantRepository restaurantRepository;
    // 특정 식당 실시간 혼잡도 조회
    public Optional<CongestionLog> getLatestCongestion(Long restaurantId) {
        return congestionLogRepository
                .findTopByRestaurantIdOrderByMeasuredAtDesc(restaurantId);
    }

    // 최근 일정 시간 동안의 혼잡도 추이 조회
    public List<CongestionLog> getRecentTrend(Long restaurantId, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return congestionLogRepository.findRecentLogs(restaurantId, since);
    }

    // 혼잡도 로그 저장 (센서/크롤러 → DB)
    //
    // 흐름:
    //   1. CongestionLog 빌더로 생성 (measuredAt 자동 세팅)
    //   2. DB에 저장
    @Transactional  // 저장은 readOnly 해제
    public CongestionLog saveCongestion(Long restaurantId, int peopleCount) {
        // Restaurant 객체가 필요하므로 RestaurantRepository도 주입해야 하지만
        // 여기선 간결하게 표현 → 실제 구현 시 RestaurantRepository.getReferenceById() 활용
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 식당입니다. ID: " + restaurantId));

        CongestionLog log = CongestionLog.builder()
                .restaurant(restaurant)
                .peopleCount(peopleCount)
                .build();

        return congestionLogRepository.save(log);
    }
}
