package com.jnuhub.repository;

import com.jnuhub.model.FaqDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaqDocumentRepository extends JpaRepository<FaqDocument, Long> {
    // 활성화된 FAQ 전체 조회
    List<FaqDocument> findByIsActiveTrue();
    // 카테고리별 활성 FAQ 조회
    List<FaqDocument> findByCategoryAndIsActiveTrue(String category);
    // 키워드 기반 단순 텍스트 검색
    @Query("""
            SELECT f FROM FaqDocument f
            WHERE f.isActive = true
              AND (f.question LIKE %:keyword%
               OR f.answer   LIKE %:keyword%)
            """)
    List<FaqDocument> searchByKeyword(@Param("keyword") String keyword);
}
