package com.jnuhub.infra.gemini;

import com.google.genai.Client;
import com.google.genai.errors.ClientException;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient {

    private static final Pattern RETRY_AFTER_SEC = Pattern.compile(
            "Please retry in ([0-9.]+)\\s*s", Pattern.CASE_INSENSITIVE);

    private static final GenerateContentConfig CONFIG = GenerateContentConfig.builder()
            .systemInstruction(Content.builder()
                    .parts(List.of(Part.builder()
                            .text("전남대 학식·기숙사 식단 추천 도우미입니다.\n"
                                    + "반드시 한국어로만 답합니다. 영어 문장·영어 설명(예: 분석하는 글)은 사용하지 마세요.\n"
                                    + "사용자가 준 형식·길이 제한을 정확히 따릅니다.")
                            .build()))
                    .build())
            .temperature(0.35f)
            .build();

    private final Client googleGenaiClient;
    private final GeminiProperties properties;

    public String generate(String prompt) {
        List<Content> contents = List.of(
                Content.builder()
                        .role("user")
                        .parts(List.of(
                                Part.builder()
                                        .text(prompt)
                                        .build()
                        ))
                        .build()
        );

        String model = resolveModel();
        int maxAttempts = Math.max(1, properties.getMaxRetries());

        ClientException last429 = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                GenerateContentResponse res = googleGenaiClient.models.generateContent(
                        model, contents, CONFIG);

                String text = res.text();
                if (text != null && !text.isBlank()) {
                    return text.strip();
                }
                return "분석 결과가 없습니다.";

            } catch (ClientException e) {
                if (e.code() != 429) {
                    logFailure(e, model);
                    throw new RuntimeException("Gemini API 호출 실패", e);
                }
                last429 = e;
                if (attempt >= maxAttempts) {
                    break;
                }
                long waitMs = resolve429WaitMillis(e);
                log.warn("[Gemini SDK] model={} 429 할당량/속도 제한 — {}ms 후 재시도 ({}/{})",
                        model, waitMs, attempt, maxAttempts);
                sleepQuietly(waitMs);

            } catch (Exception e) {
                log.error("[Gemini SDK] 호출 실패 (model={}): {}", model, e.getMessage(), e);
                throw new RuntimeException("Gemini API 호출 실패", e);
            }
        }

        logFailure(last429, model);
        throw new RuntimeException("Gemini API 호출 실패", last429);
    }

    private String resolveModel() {
        String m = properties.getModel();
        if (m != null && !m.isBlank()) {
            return m.trim();
        }
        return "gemini-2.0-flash";
    }

    private static long resolve429WaitMillis(ClientException e) {
        long fromMessage = parseRetryAfterMs(e.getMessage());
        if (fromMessage > 0) {
            return Math.min(fromMessage + 500, 120_000);
        }
        return 10_000;
    }

    private static long parseRetryAfterMs(String message) {
        if (message == null) {
            return 0;
        }
        Matcher m = RETRY_AFTER_SEC.matcher(message);
        if (!m.find()) {
            return 0;
        }
        try {
            double sec = Double.parseDouble(m.group(1));
            return (long) (sec * 1000);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Gemini 재시도 대기 중 인터럽트", ie);
        }
    }

    private void logFailure(ClientException e, String model) {
        log.error("[Gemini SDK] 호출 실패 (model={}): {}", model, e.getMessage(), e);
        String msg = e.getMessage();
        if (msg != null && msg.contains("limit: 0")) {
            log.error("[Gemini SDK] 이 model 은 현재 키의 무료 플랜에서 쓸 수 없습니다(할당량 0). "
                    + "application.yml 의 gemini.api.model 을 gemini-2.0-flash 또는 gemini-1.5-flash 로 바꿔 보세요.");
        }
    }
}
