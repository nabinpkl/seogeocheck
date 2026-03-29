package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.config.AuthProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;

@Service
public class AuthFrontendLinkService {

    private final AuthProperties authProperties;

    public AuthFrontendLinkService(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public String buildVerificationFailureRedirect(AuthService.VerificationFailureReason failureReason) {
        String status = switch (failureReason) {
            case EXPIRED -> "expired";
            case INVALID -> "invalid";
        };
        return appendStatusToFrontendPath("/auth/verify-email", status, null);
    }

    public String buildVerificationSuccessRedirect() {
        return appendStatusToFrontendPath("/auth/verify-email", "success", null);
    }

    public String buildVerificationReadyRedirect(String rawToken) {
        return appendStatusToFrontendPath("/auth/verify-email", "ready", rawToken);
    }

    public String buildPasswordResetReadyRedirect(String rawToken) {
        return appendStatusToFrontendPath("/auth/reset-password", "ready", rawToken);
    }

    public String buildPasswordResetFailureRedirect(AuthService.PasswordResetFailureReason failureReason) {
        String status = switch (failureReason) {
            case EXPIRED -> "expired";
            case INVALID -> "invalid";
        };
        return appendStatusToFrontendPath("/auth/reset-password", status, null);
    }

    private String appendStatusToFrontendPath(String path, String status, String rawToken) {
        UriComponentsBuilder builder = ServletUriComponentsBuilder.fromPath(path)
                .queryParam("status", status);
        if (rawToken != null) {
            builder.fragment("token=" + UriUtils.encode(rawToken, StandardCharsets.UTF_8));
        }
        return URI.create(authProperties.getPublicAppUrl())
                .resolve(builder.build(true).toUriString())
                .toString();
    }
}
