package com.nabin.seogeo.auth.config;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class OAuthAuthorizationUserGuardFilter extends OncePerRequestFilter {

    private final AuthProperties authProperties;
    private final RequestMatcher matcher = new OrRequestMatcher(
            PathPatternRequestMatcher.withDefaults().matcher("/oauth2/authorize"),
            PathPatternRequestMatcher.withDefaults().matcher("/oauth2/consent")
    );

    public OAuthAuthorizationUserGuardFilter(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !this.matcher.matches(request);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            if (user.isAnonymous()) {
                response.setStatus(HttpServletResponse.SC_FOUND);
                response.setHeader(HttpHeaders.LOCATION, buildSignInRedirect(request));
                return;
            }
            if (!user.isEmailVerified()) {
                response.setStatus(HttpServletResponse.SC_FOUND);
                response.setHeader(HttpHeaders.LOCATION, buildVerificationRedirect(user));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String buildSignInRedirect(HttpServletRequest request) {
        String currentRequestUrl = request.getRequestURL().toString();
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            currentRequestUrl += "?" + request.getQueryString();
        }
        return UriComponentsBuilder.fromUriString(this.authProperties.getPublicAppUrl())
                .path("/sign-in")
                .queryParam("next", currentRequestUrl)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUriString();
    }

    private String buildVerificationRedirect(AuthenticatedUser user) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(this.authProperties.getPublicAppUrl())
                .path("/auth/verify-email")
                .queryParam("status", "sent");
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            builder.queryParam("email", user.getEmail());
        }
        return builder.encode(StandardCharsets.UTF_8).build().toUriString();
    }
}
