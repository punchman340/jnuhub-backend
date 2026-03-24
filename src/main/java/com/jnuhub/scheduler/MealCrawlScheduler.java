package com.jnuhub.scheduler;

import com.jnuhub.crawler.JnuMealCrawler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MealCrawlScheduler {

    private final JnuMealCrawler crawler;

    // 매일 아침 7시 전체 크롤 (월요일에 주간 식단 갱신)
    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Seoul")
    public void scheduledCrawl() {
        log.info("[스케줄러] 식단 크롤링 시작");
        crawler.crawlAll();
        log.info("[스케줄러] 식단 크롤링 완료");
    }
}
