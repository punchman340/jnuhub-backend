package com.jnuhub.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "crawl_meta",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"restaurant_id", "target_date"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CrawlMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false)
    private LocalDateTime lastAttemptedAt;  // 시도 시간 (실패 포함)

    @Column
    private LocalDateTime lastSucceededAt;  // 마지막 성공 시간 = 신선도 기준

    @Column(nullable = false, length = 20)
    private String status;  // SUCCESS | FAIL | PARTIAL

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Builder
    public CrawlMeta(Restaurant restaurant, LocalDate targetDate,
                     String status, String errorMessage) {
        this.restaurant      = restaurant;
        this.targetDate      = targetDate;
        this.lastAttemptedAt = LocalDateTime.now();
        this.lastSucceededAt = "SUCCESS".equals(status) ? LocalDateTime.now() : null;
        this.status          = status;
        this.errorMessage    = errorMessage;
    }

    // 크롤링 재시도 후 결과 업데이트
    public void updateResult(String status, String errorMessage) {
        this.lastAttemptedAt = LocalDateTime.now();
        this.status          = status;
        this.errorMessage    = errorMessage;
        if ("SUCCESS".equals(status)) {
            this.lastSucceededAt = LocalDateTime.now();
        }
    }
}
