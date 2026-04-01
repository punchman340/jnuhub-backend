    package com.jnuhub.infra.gemini;

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;
    import lombok.RequiredArgsConstructor;
    import lombok.extern.slf4j.Slf4j;
    import org.springframework.stereotype.Component;

    import java.util.List;

    @Slf4j
    @Component
    @RequiredArgsConstructor
    public class GeminiClient {

        private final GeminiProperties properties;

        public String generate(String prompt) {
            // 1. SDK 클라이언트 초기화
            Client client = Client.builder()
                    .apiKey(properties.getKey())
                    .build();

            // 2. 입력 데이터 구성 (fromText 대신 빌더 사용)
            List<Content> contents = List.of(
                    Content.builder()
                            .role("user")
                            .parts(List.of(
                                    Part.builder()
                                            .text(prompt) // 👈 여기서 텍스트를 직접 꽂아줍니다
                                            .build()
                            ))
                            .build()
            );

            // 3. 모델 설정
            String model = "gemini-2.0-flash-lite";

            try {
                // API 호출
                GenerateContentResponse res = client.models.generateContent(model, contents, null);

                // 4. 결과 파싱 (Optional 처리)
                if (res.candidates().isPresent() && !res.candidates().get().isEmpty()) {
                    // 구조가 깊으므로 단계별로 텍스트를 추출합니다.
                    return res.candidates().get().get(0)
                            .content().get()
                            .parts().get().get(0)
                            .text().orElse("분석 결과 텍스트가 비어있습니다.");
                }
                return "분석 결과가 없습니다.";

            } catch (Exception e) {
                log.error("[Gemini SDK] 호출 실패: {}", e.getMessage());
                throw new RuntimeException("Gemini API 호출 실패", e);
            }
        }
    }