package com.jnuhub.service;

import com.jnuhub.model.FaqDocument;
import com.jnuhub.repository.FaqDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService {

    private final FaqDocumentRepository faqDocumentRepository;
    // 활성화된 전체 FAQ 조회
    public List<FaqDocument> getAllFaq() {
        return faqDocumentRepository.findByIsActiveTrue();
    }
    // 카테고리별 활성화된 FAQ 조회
    public List<FaqDocument> getFaqByCategory(String category) {
        return faqDocumentRepository.findByCategoryAndIsActiveTrue(category);
    }

    // 질문/답변 내용에 키워드 포함된 FAQ 검색
    // *** 아직 gemini api 추가 안 함. 나중에 추가 예정 ***
    public List<FaqDocument> searchFaq(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return getAllFaq();  // 키워드 없으면 전체 반환
        }
        return faqDocumentRepository.searchByKeyword(keyword);
    }
}
