package com.jnuhub.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "E001", "잘못된 입력값입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "E002", "서버 내부 오류가 발생했습니다."),

    // 식단
    MEAL_NOT_FOUND(HttpStatus.NOT_FOUND, "M001", "해당 날짜의 식단 정보가 없습니다."),
    MEAL_CRAWL_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "M002", "식단 크롤링에 실패했습니다."),

    // 식당
    RESTAURANT_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "식당 정보를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
