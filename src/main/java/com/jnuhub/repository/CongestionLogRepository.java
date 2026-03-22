package com.jnuhub.repository;

import com.jnuhub.model.CongestionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CongestionLogRepository extends JpaRepository<CongestionLog, Long> {
    // 실시간 혼잡도용 최신 로그 1건 추출
    Optional<CongestionLog> findTopByRestaurantIdOrderByMeasuredAtDesc(
            Long restaurantId);
    // 특정 시험 이후 변화 추이 조회
    @Query("""
            SELECT c FROM CongestionLog c
            WHERE c.restaurant.id = :restaurantId
              AND c.measuredAt >= :since
            ORDER BY c.measuredAt DESC
            """)
    List<CongestionLog> findRecentLogs(
            @Param("restaurantId") Long restaurantId,
            @Param("since") LocalDateTime since);
}
