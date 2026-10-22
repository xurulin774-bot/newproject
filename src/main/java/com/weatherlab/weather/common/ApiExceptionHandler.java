package com.weatherlab.weather.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalidBody(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst().map(error -> error.getDefaultMessage())
                .orElse("请求参数无效");
        return response(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, Object>> duplicateKey(DuplicateKeyException exception) {
        return response(HttpStatus.CONFLICT, "用户名已被注册");
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class,
            IllegalArgumentException.class})
    public ResponseEntity<Map<String, Object>> badRequest(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage() == null ? "Invalid request" : exception.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> notFound(NoSuchElementException exception) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> unauthorized(SecurityException exception) {
        return response(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> internalError(Exception exception) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR,
                exception.getMessage() == null ? "Internal server error" : exception.getMessage());
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
