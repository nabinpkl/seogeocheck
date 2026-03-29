package com.nabin.seogeo.auth.controller;

import com.nabin.seogeo.auth.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.util.Map;

@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(AuthService.InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleInvalidCredentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "INVALID_CREDENTIALS",
                "message", AuthService.GENERIC_LOGIN_MESSAGE
        ));
    }

    @ExceptionHandler(AuthService.InvalidPasswordException.class)
    public ResponseEntity<Map<String, String>> handleInvalidPassword(AuthService.InvalidPasswordException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_PASSWORD",
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(AuthService.EmailAlreadyRegisteredException.class)
    public ResponseEntity<Map<String, String>> handleEmailAlreadyRegistered() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "EMAIL_ALREADY_REGISTERED",
                "message", AuthService.EMAIL_ALREADY_REGISTERED_MESSAGE
        ));
    }

    @ExceptionHandler(AuthService.UnsupportedAnonymousAccountOperationException.class)
    public ResponseEntity<Map<String, String>> handleUnsupportedAnonymousAccountOperation() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", "ANONYMOUS_ACCOUNT_OPERATION_NOT_ALLOWED",
                "message", "Create an account first before using this setting."
        ));
    }

    @ExceptionHandler(AuthService.VerificationTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidVerificationToken() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_VERIFICATION_TOKEN",
                "message", AuthService.GENERIC_VERIFICATION_MESSAGE
        ));
    }

    @ExceptionHandler(AuthService.PasswordResetTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidPasswordResetToken() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_PASSWORD_RESET_TOKEN",
                "message", AuthService.GENERIC_RESET_MESSAGE
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse("The request body is invalid.");
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_REQUEST",
                "message", message
        ));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, String>> handleHandlerMethodValidation(HandlerMethodValidationException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_REQUEST",
                "message", "The request is invalid."
        ));
    }
}
