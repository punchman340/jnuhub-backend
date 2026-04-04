package com.jnuhub.infra.gemini;

import com.google.genai.Client;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleGenaiClientConfig {

    @Bean(destroyMethod = "close")
    Client googleGenaiClient(GeminiProperties properties) {
        return Client.builder()
                .apiKey(properties.getKey())
                .build();
    }
}
