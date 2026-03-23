package com.jnuhub.repository;

import com.jnuhub.model.CrawlMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CrawlMetaRepository extends JpaRepository<CrawlMeta, Long> {
    // 특정 날짜/식당의 수집 상태 조회
    Optional<CrawlMeta> findByRestaurantIdAndTargetDate(
            Long restaurantId, LocalDate targetDate);
    // 실패/미완료 상태인 재시도 대상 조회
    List<CrawlMeta> findByTargetDateAndStatusNot(
            LocalDate targetDate, String status);
    // 이번주 신선도 데이터 조회
    List<CrawlMeta> findByRestaurantIdAndTargetDateBetween(
            Long restaurantId, LocalDate start, LocalDate end);
}
