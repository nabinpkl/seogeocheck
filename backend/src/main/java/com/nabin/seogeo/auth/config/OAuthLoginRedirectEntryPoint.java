package com.nabin.seogeo.auth.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class OAuthLoginRedirectEntryPoint implements AuthenticationEntryPoint {

    private final AuthProperties authProperties;

    public OAuthLoginRedirectEntryPoint(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        String currentRequestUrl = request.getRequestURL().toString();
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            currentRequestUrl += "?" + request.getQueryString();
        }
        String redirectUrl = UriComponentsBuilder.fromUriString(authProperties.getPublicAppUrl())
                .path("/sign-in")
                .queryParam("next", currentRequestUrl)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUriString();
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(HttpHeaders.LOCATION, redirectUrl);
    }
}
