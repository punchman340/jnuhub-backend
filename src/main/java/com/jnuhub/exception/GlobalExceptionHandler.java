package com.jnuhub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // restaurantId 없는 식당 조회 시 → 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException e
    ) {
        return ResponseEntity
                .badRequest()
                .body(errorBody(HttpStatus.BAD_REQUEST, e.getMessage()));
    }

    // ?date=abc 같은 타입 불일치 → 400
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException e
    ) {
        String message = "잘못된 파라미터 형식입니다: " + e.getName();
        return ResponseEntity
                .badRequest()
                .body(errorBody(HttpStatus.BAD_REQUEST, message));
    }

    // @RequestParam 필수값 누락 → 400
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(
            MissingServletRequestParameterException e
    ) {
        String message = "필수 파라미터가 없습니다: " + e.getParameterName();
        return ResponseEntity
                .badRequest()
                .body(errorBody(HttpStatus.BAD_REQUEST, message));
    }

    // 그 외 예상치 못한 예외 → 500
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        return ResponseEntity
                .internalServerError()
                .body(errorBody(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류입니다."));
    }

    // 공통 에러 응답 포맷
    private Map<String, Object> errorBody(HttpStatus status, String message) {
        return Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status",    status.value(),
                "error",     status.getReasonPhrase(),
                "message",   message
        );
    }
}
