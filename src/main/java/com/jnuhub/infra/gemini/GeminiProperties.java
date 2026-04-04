package com.jnuhub.infra.gemini;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "gemini.api")
public class GeminiProperties {

    private String key;

    /** REST 예시용 URL (Java SDK는 미사용) */
    private String url;

    /**
     * Gemini 모델 ID. 무료 플랜에서 {@code gemini-2.0-flash-lite} 는 할당량이 0으로 막히는 경우가 많음.
     * {@code gemini-2.0-flash} 또는 {@code gemini-1.5-flash} 권장.
     */
    private String model = "gemini-2.0-flash";

    /** generate 호출당 최대 시도 횟수(최초 1회 + 429 시 재시도 포함) */
    private int maxRetries = 5;
}
