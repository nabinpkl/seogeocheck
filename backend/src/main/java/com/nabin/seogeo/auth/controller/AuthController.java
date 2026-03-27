package com.nabin.seogeo.auth.controller;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@RestController
@Validated
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(
                request.email(),
                request.password()
        );
        return ResponseEntity.accepted().body(Map.of("message", AuthService.GENERIC_REGISTER_MESSAGE));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpServletRequest,
            HttpServletResponse httpServletResponse
    ) {
        AuthenticatedUser user = authService.login(
                request.email(),
                request.password(),
                httpServletRequest,
                httpServletResponse
        );
        return ResponseEntity.ok(new LoginResponse(true, UserResponse.from(user)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.accepted().body(Map.of("message", AuthService.GENERIC_FORGOT_PASSWORD_MESSAGE));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Boolean>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.password());
        return ResponseEntity.ok(Map.of("reset", true));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-email")
    public Map<String, Boolean> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmailToken(request.token());
        return Map.of("verified", true);
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of(
                "headerName", csrfToken.getHeaderName(),
                "parameterName", csrfToken.getParameterName(),
                "token", csrfToken.getToken()
        );
    }

    @GetMapping("/verify-email-link")
    public ResponseEntity<Void> verifyEmailLink(@RequestParam("token") String token) {
        try {
            authService.assertVerificationTokenIsUsable(token);
            return ResponseEntity.status(HttpStatus.SEE_OTHER)
                    .location(URI.create(authService.buildFrontendVerificationReadyRedirect(token)))
                    .build();
        } catch (AuthService.VerificationTokenException verificationTokenException) {
            return ResponseEntity.status(HttpStatus.SEE_OTHER)
                    .location(URI.create(authService.buildFrontendVerificationRedirect(verificationTokenException.getReason())))
                    .build();
        }
    }

    @GetMapping("/reset-password-link")
    public ResponseEntity<Void> resetPasswordLink(@RequestParam("token") String token) {
        try {
            authService.assertPasswordResetTokenIsUsable(token);
            return ResponseEntity.status(HttpStatus.SEE_OTHER)
                    .location(URI.create(authService.buildFrontendPasswordResetReadyRedirect(token)))
                    .build();
        } catch (AuthService.PasswordResetTokenException passwordResetTokenException) {
            return ResponseEntity.status(HttpStatus.SEE_OTHER)
                    .location(URI.create(authService.buildFrontendPasswordResetFailureRedirect(passwordResetTokenException.getReason())))
                    .build();
        }
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return UserResponse.from(authService.requireAuthenticatedUser(authentication.getPrincipal()));
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank String password
    ) {
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank String password
    ) {
    }

    public record VerifyEmailRequest(@NotBlank String token) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 320) String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank String password
    ) {
    }

    public record LoginResponse(boolean authenticated, UserResponse user) {
    }

    public record UserResponse(
            java.util.UUID id,
            String email,
            boolean emailVerified,
            java.time.OffsetDateTime createdAt
    ) {
        static UserResponse from(AuthenticatedUser user) {
            return new UserResponse(user.getId(), user.getEmail(), user.isEmailVerified(), user.getCreatedAt());
        }
    }
}
