package com.jnuhub.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String code;
    private final String message;
    private final T data;

    // 성공
    private ApiResponse(T data) {
        this.success = true;
        this.code = "SUCCESS";
        this.message = null;
        this.data = data;
    }

    // 실패
    private ApiResponse(String code, String message) {
        this.success = false;
        this.code = code;
        this.message = message;
        this.data = null;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(code, message);
    }
}
