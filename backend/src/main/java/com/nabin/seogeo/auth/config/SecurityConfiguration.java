package com.nabin.seogeo.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Clock;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
@EnableJdbcHttpSession
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectMapper objectMapper,
            SecurityContextRepository securityContextRepository
    ) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .ignoringRequestMatchers(
                                "/health",
                                "/error",
                                "/audits/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**"
                        )
                )
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .rememberMe(AbstractHttpConfigurer::disable)
                .securityContext(security -> security.securityContextRepository(securityContextRepository))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> writeJson(
                                response,
                                objectMapper,
                                HttpServletResponse.SC_UNAUTHORIZED,
                                Map.of(
                                        "error", "UNAUTHORIZED",
                                        "message", "Authentication is required."
                                )
                        ))
                        .accessDeniedHandler(accessDeniedHandler(objectMapper))
                )
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/health",
                                "/error",
                                "/audits/**",
                                "/auth/register",
                                "/auth/login",
                                "/auth/logout",
                                "/auth/csrf",
                                "/auth/forgot-password",
                                "/auth/reset-password",
                                "/auth/reset-password-link",
                                "/auth/verify-email",
                                "/auth/verify-email-link",
                                "/swagger-ui/**",
                                "/v3/api-docs/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        HttpSessionSecurityContextRepository repository = new HttpSessionSecurityContextRepository();
        repository.setDisableUrlRewriting(true);
        return repository;
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new ChangeSessionIdAuthenticationStrategy();
    }

    @Bean
    SecurityContextHolderStrategy securityContextHolderStrategy() {
        return SecurityContextHolder.getContextHolderStrategy();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AuthProperties authProperties) {
        Set<String> allowedOrigins = new LinkedHashSet<>(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000"
        ));
        extractOrigin(authProperties.getPublicAppUrl()).ifPresent(allowedOrigins::add);

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.copyOf(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Content-Type",
                "Authorization",
                "X-CSRF-TOKEN",
                "X-XSRF-TOKEN"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) -> writeJson(
                response,
                objectMapper,
                HttpServletResponse.SC_FORBIDDEN,
                Map.of(
                        "error", "FORBIDDEN",
                        "message", "You do not have permission to access this resource."
                )
        );
    }

    private static java.util.Optional<String> extractOrigin(String url) {
        try {
            java.net.URI uri = java.net.URI.create(url);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return java.util.Optional.empty();
            }
            StringBuilder origin = new StringBuilder()
                    .append(uri.getScheme())
                    .append("://")
                    .append(uri.getHost());
            if (uri.getPort() != -1) {
                origin.append(':').append(uri.getPort());
            }
            return java.util.Optional.of(origin.toString());
        } catch (IllegalArgumentException exception) {
            return java.util.Optional.empty();
        }
    }

    private static void writeJson(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            int status,
            Map<String, Object> payload
    ) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), payload);
    }
}
