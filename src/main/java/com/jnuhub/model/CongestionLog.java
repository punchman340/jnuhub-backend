package com.jnuhub.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "congestion_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CongestionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false)
    private int peopleCount;

    @Column(nullable = false)
    private LocalDateTime measuredAt;

    @Builder
    public CongestionLog(Restaurant restaurant, int peopleCount) {
        this.restaurant  = restaurant;
        this.peopleCount = peopleCount;
        this.measuredAt  = LocalDateTime.now();
    }
}
