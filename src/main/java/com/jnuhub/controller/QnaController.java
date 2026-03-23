package com.jnuhub.controller;

import com.jnuhub.model.FaqDocument;
import com.jnuhub.service.QnaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/qna")
@RequiredArgsConstructor
public class QnaController {
    private final QnaService qnaService;
    // GET /api/qna?keyword=~~
    @GetMapping
    public ResponseEntity<List<FaqDocument>> search(
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(qnaService.searchFaq(keyword));
    }

    // GET /api/qna/all  (관리자용 전체 조회)
    @GetMapping("/all")
    public ResponseEntity<List<FaqDocument>> getAll() {
        return ResponseEntity.ok(qnaService.getAllFaq());
    }
}
