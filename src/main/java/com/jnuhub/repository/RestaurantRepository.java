package com.jnuhub.repository;

import com.jnuhub.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    // 특정 캠퍼스의 모든 식당 조회
    List<Restaurant> findByCampus(String campus);
    // 캠퍼스 내 특정 카테고리 조회
    List<Restaurant> findByCampusAndCategory(String campus, String category);
    // 식당 이름으로 조회
    Optional<Restaurant> findByName(String name);
}
