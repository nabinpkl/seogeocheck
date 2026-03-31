package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.mail.AuthEmailSender;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import com.nabin.seogeo.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

abstract class AbstractAuthIntegrationTest {

    @Autowired
    protected RestTestClient restTestClient;

    @Autowired
    protected AuthUserRepository authUserRepository;

    @Autowired
    protected AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository;

    @Autowired
    protected AuthPasswordResetTokenRepository authPasswordResetTokenRepository;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected CapturingAuthEmailSender authEmailSender;

    @Autowired
    protected AuthService authService;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from spring_session_attributes");
        jdbcTemplate.update("delete from spring_session");
        jdbcTemplate.update("delete from oauth2_authorization_consent");
        jdbcTemplate.update("delete from oauth2_authorization");
        jdbcTemplate.update("delete from audit_claim_tokens");
        jdbcTemplate.update("delete from audit_run_summary_high_issues");
        jdbcTemplate.update("delete from audit_run_summaries");
        jdbcTemplate.update("delete from audit_project_links");
        jdbcTemplate.update("delete from project_tracked_urls");
        jdbcTemplate.update("delete from projects");
        jdbcTemplate.update("delete from audit_reports");
        jdbcTemplate.update("delete from audit_events");
        jdbcTemplate.update("delete from audit_runs");
        authPasswordResetTokenRepository.deleteAll();
        authEmailVerificationTokenRepository.deleteAll();
        authUserRepository.deleteAll();
        authEmailSender.clear();
    }

    protected Map<String, Object> register(String email, String password) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "email", email,
                        "password", password
                ))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected void verifyLatestEmailToken() {
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        verifyToken(extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl()));
    }

    protected Map<String, Object> forgotPassword(String email) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of("email", email))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected String loginAndExtractSessionCookie(String email, String password) {
        return loginAndExtractSessionCookie(email, password, null);
    }

    protected String createGuestAndExtractSessionCookie() {
        CsrfState csrf = fetchCsrfState();
        var guestResult = restTestClient.post()
                .uri("/auth/guest")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of())
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);
        String cookie = extractCookie(guestResult.getResponseHeaders(), "seogeo_session");
        assertThat(cookie).contains("seogeo_session=");
        return cookie;
    }

    protected String loginAndExtractSessionCookie(String email, String password, String claimToken) {
        CsrfState csrf = fetchCsrfState();
        var loginResult = restTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(claimToken == null
                        ? Map.of(
                                "email", email,
                                "password", password
                        )
                        : Map.of(
                                "email", email,
                                "password", password,
                                "claimToken", claimToken
                        ))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);
        String cookie = extractCookie(loginResult.getResponseHeaders(), "seogeo_session");
        assertThat(cookie).contains("seogeo_session=");
        return cookie;
    }

    protected void expectAuthenticatedUser(String sessionCookie, String expectedEmail) {
        restTestClient.get()
                .uri("/auth/me")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body.get("email")).isEqualTo(expectedEmail);
                    assertThat(body.get("emailVerified")).isEqualTo(true);
                });
    }

    protected Map<String, Object> loginExpectUnauthorized(String email, String password) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "email", email,
                        "password", password
                ))
                .exchange()
                .expectStatus().isUnauthorized()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected Map<String, Object> verifyToken(String token) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of("token", token))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected Map<String, Object> verifyExpectBadRequest(String token) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of("token", token))
                .exchange()
                .expectStatus().isBadRequest()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected Map<String, Object> resetPassword(String token, String password) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "token", token,
                        "password", password
                ))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected Map<String, Object> resetExpectBadRequest(String token, String password) {
        CsrfState csrf = fetchCsrfState();
        return restTestClient.post()
                .uri("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "token", token,
                        "password", password
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .returnResult(Map.class)
                .getResponseBody();
    }

    protected void deleteAccount(String sessionCookie) {
        CsrfState csrf = fetchCsrfState(sessionCookie);
        restTestClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/auth/account")
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .exchange()
                .expectStatus().isNoContent();
    }

    protected static String extractToken(String actionUrl) {
        String fragment = UriComponentsBuilder.fromUriString(actionUrl)
                .build()
                .getFragment();
        if (fragment == null || fragment.isBlank()) {
            return null;
        }
        return UriComponentsBuilder.newInstance()
                .query(fragment)
                .build()
                .getQueryParams()
                .getFirst("token");
    }

    protected CsrfState fetchCsrfState(String... existingCookies) {
        var request = restTestClient.get()
                .uri("/auth/csrf")
                .accept(MediaType.APPLICATION_JSON);
        if (existingCookies.length > 0) {
            request.header(HttpHeaders.COOKIE, combineCookies(existingCookies));
        }

        var result = request.exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        List<String> responseCookies = result.getResponseHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(responseCookies).isNotNull();
        assertThat(responseCookies).isNotEmpty();
        String cookie = combineCookies(
                Arrays.stream(existingCookies).toArray(String[]::new)
        );
        String responseCookieHeader = responseCookies.stream()
                .map(entry -> entry.split(";", 2)[0])
                .collect(Collectors.joining("; "));
        cookie = cookie.isBlank() ? responseCookieHeader : combineCookies(cookie, responseCookieHeader);
        assertThat(cookie).contains("XSRF-TOKEN=");

        Map<String, Object> body = result.getResponseBody();
        return new CsrfState(
                body.get("token").toString(),
                cookie
        );
    }

    protected StartedAudit startVisitorAudit(String url) {
        var result = restTestClient.post()
                .uri("/audits")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("url", url))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class);
        Map<String, Object> responseBody = result.getResponseBody();
        return new StartedAudit(
                String.valueOf(responseBody.get("jobId")),
                responseBody.get("claimToken") == null ? null : String.valueOf(responseBody.get("claimToken")),
                extractCookieOrFallback(result.getResponseHeaders(), "seogeo_session", null)
        );
    }

    protected String continueAsGuestAndExtractSessionCookie(String claimToken) {
        CsrfState csrf = fetchCsrfState();
        var guestResult = restTestClient.post()
                .uri("/auth/guest")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(claimToken == null ? Map.of() : Map.of("claimToken", claimToken))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);
        return extractCookie(guestResult.getResponseHeaders(), "seogeo_session");
    }

    protected void expectOwnedAudits(String sessionCookie, String expectedJobId) {
        restTestClient.get()
                .uri("/account/audits")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> assertThat(body).anySatisfy(item -> {
                    Map<String, Object> audit = (Map<String, Object>) item;
                    assertThat(audit.get("jobId")).isEqualTo(expectedJobId);
                }));
    }

    protected String extractCookie(HttpHeaders headers, String cookieName) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotNull();
        return cookies.stream()
                .map(cookie -> cookie.split(";", 2)[0])
                .filter(cookie -> cookie.startsWith(cookieName + "="))
                .reduce((first, second) -> second)
                .orElseThrow();
    }

    protected String extractCookieOrFallback(HttpHeaders headers, String cookieName, String fallbackCookie) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        if (cookies == null) {
            return fallbackCookie;
        }
        return cookies.stream()
                .map(cookie -> cookie.split(";", 2)[0])
                .filter(cookie -> cookie.startsWith(cookieName + "="))
                .reduce((first, second) -> second)
                .orElse(fallbackCookie);
    }

    protected void awaitEmailsOfType(EmailType emailType, int expectedCount) {
        Instant deadline = Instant.now().plusSeconds(2);
        while (Instant.now().isBefore(deadline)) {
            if (authEmailSender.messagesOfType(emailType).size() >= expectedCount) {
                return;
            }
            try {
                Thread.sleep(25);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        assertThat(authEmailSender.messagesOfType(emailType)).hasSize(expectedCount);
    }

    protected static String combineCookies(String... cookies) {
        return Arrays.stream(cookies)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("; "));
    }

    protected int awaitSessionCount() {
        Instant deadline = Instant.now().plusSeconds(2);
        Integer count = 0;
        while (Instant.now().isBefore(deadline)) {
            count = jdbcTemplate.queryForObject("select count(*) from spring_session", Integer.class);
            if (count != null && count > 0) {
                return count;
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return count == null ? 0 : count;
    }

    @SafeVarargs
    protected final List<Object> runConcurrently(Callable<Object>... tasks) {
        CyclicBarrier barrier = new CyclicBarrier(tasks.length);
        try (ExecutorService executorService = Executors.newFixedThreadPool(tasks.length)) {
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<Object> task : tasks) {
                futures.add(executorService.submit(() -> {
                    barrier.await();
                    try {
                        return task.call();
                    } catch (Exception exception) {
                        return exception;
                    }
                }));
            }

            List<Object> results = new ArrayList<>();
            for (Future<Object> future : futures) {
                results.add(future.get());
            }
            return results;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    protected enum EmailType {
        VERIFICATION,
        PASSWORD_RESET
    }

    protected static final class CapturingAuthEmailSender implements AuthEmailSender {

        private final List<SentEmail> messages = new ArrayList<>();

        @Override
        public synchronized void sendVerificationEmail(String recipientEmail, String verificationUrl, OffsetDateTime expiresAt) {
            messages.add(new SentEmail(EmailType.VERIFICATION, recipientEmail, verificationUrl, expiresAt));
        }

        @Override
        public synchronized void sendPasswordResetEmail(String recipientEmail, String resetUrl, OffsetDateTime expiresAt) {
            messages.add(new SentEmail(EmailType.PASSWORD_RESET, recipientEmail, resetUrl, expiresAt));
        }

        synchronized List<SentEmail> messages() {
            return List.copyOf(messages);
        }

        synchronized List<SentEmail> messagesOfType(EmailType emailType) {
            return messages.stream().filter(message -> message.emailType() == emailType).toList();
        }

        synchronized SentEmail lastEmailOfType(EmailType emailType) {
            return messages.stream()
                    .filter(message -> message.emailType() == emailType)
                    .reduce((first, second) -> second)
                    .orElseThrow();
        }

        synchronized void clear() {
            messages.clear();
        }
    }

    protected record SentEmail(EmailType emailType, String recipientEmail, String actionUrl, OffsetDateTime expiresAt) {
    }

    protected record CsrfState(String token, String cookie) {
    }

    protected record StartedAudit(String jobId, String claimToken, String sessionCookie) {
    }
}
