package com.jnuhub.controller;

import com.jnuhub.crawler.JnuMealCrawler;
import com.jnuhub.dto.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final JnuMealCrawler crawler;

    // POST /api/admin/crawl
    @PostMapping("/crawl")
    public ResponseEntity<ApiResponse<String>> triggerCrawl() {
        log.info("[어드민] 수동 크롤링 요청");
        crawler.crawlAll();
        log.info("[어드민] 수동 크롤링 완료");
        return ResponseEntity.ok(ApiResponse.ok("크롤링 완료"));
    }
}
