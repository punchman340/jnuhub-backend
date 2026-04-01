package com.jnuhub.scheduler;

import com.jnuhub.crawler.JnuMealCrawler;
import com.jnuhub.service.MealAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class MealCrawlScheduler {

    private final JnuMealCrawler crawler;
    private final MealAiService mealAiService;
    // 매일 아침 7시 전체 크롤 (월요일에 주간 식단 갱신)
    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Seoul")
    public void scheduledCrawl() {
        log.info("[스케줄러] 식단 크롤링 시작");
        crawler.crawlAll();
        log.info("[스케줄러] 식단 크롤링 완료");

        log.info("[스케줄러] AI 식단 추천 생성 시작");
        mealAiService.generateAndCacheAnswers(LocalDate.now());
        log.info("[스케줄러] AI 식단 추천 생성 완료");
    }
}
