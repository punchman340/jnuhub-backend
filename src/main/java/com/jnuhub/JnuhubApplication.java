package com.jnuhub;

import com.jnuhub.crawler.JnuMealCrawler;
import com.jnuhub.service.MealAiService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.LocalDate;

@EnableJpaAuditing
@SpringBootApplication
public class JnuhubApplication {
	public static void main(String[] args) {
		SpringApplication.run(JnuhubApplication.class, args);
	}
	// 서버 시작 후 실행되는 코드
	@Bean
	CommandLineRunner init(JnuMealCrawler crawler, MealAiService mealAiService) {
		return args -> {
			System.out.println("====== 오늘 식단 크롤링 시작 ======");
			crawler.crawlAll(); // 모든 식당 긁어오기
			System.out.println("====== 크롤링 완료 ======");

			System.out.println("====== AI 식단 분석 시작 ======");
			mealAiService.generateAndCacheAnswers(LocalDate.now());
			System.out.println("====== AI 분석 완료 ======");
		};
	}
}