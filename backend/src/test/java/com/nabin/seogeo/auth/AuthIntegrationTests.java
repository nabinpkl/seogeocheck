package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.mail.AuthEmailSender;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenEntity;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenEntity;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import com.nabin.seogeo.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
class AuthIntegrationTests {

    @Autowired
    private RestTestClient restTestClient;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository;

    @Autowired
    private AuthPasswordResetTokenRepository authPasswordResetTokenRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CapturingAuthEmailSender authEmailSender;

    @Autowired
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from spring_session_attributes");
        jdbcTemplate.update("delete from spring_session");
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

    @Test
    void registrationCreatesDisabledUserAndStoresHashedVerificationToken() {
        var responseBody = register("Owner@example.com", "CorrectHorse1!");

        assertThat(responseBody).containsEntry(
                "message",
                "If the address can be used, we sent a verification email."
        );

        List<AuthUserEntity> users = authUserRepository.findAll();
        assertThat(users).hasSize(1);
        AuthUserEntity user = users.getFirst();
        assertThat(user.isEnabled()).isFalse();
        assertThat(user.getEmailVerifiedAt()).isNull();
        assertThat(user.getEmailNormalized()).isEqualTo("owner@example.com");
        assertThat(user.getPasswordHash()).startsWith("$argon2id$");

        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        List<AuthEmailVerificationTokenEntity> tokens = authEmailVerificationTokenRepository.findAll();
        assertThat(tokens).hasSize(1);
        SentEmail verificationEmail = authEmailSender.lastEmailOfType(EmailType.VERIFICATION);
        String rawToken = extractToken(verificationEmail.actionUrl());
        assertThat(verificationEmail.actionUrl())
                .isEqualTo("http://localhost:3000/auth/verify-email?status=ready#token=" + rawToken);
        assertThat(tokens.getFirst().getTokenHash()).isNotEqualTo(rawToken);
    }

    @Test
    void mutatingAuthEndpointsRequireCsrfToken() {
        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!"
                ))
                .exchange()
                .expectStatus().isForbidden();

        assertThat(authUserRepository.findAll()).isEmpty();
    }

    @Test
    void registrationRejectsPasswordsShorterThanThirteenCharacters() {
        CsrfState csrf = fetchCsrfState();

        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "123456789012"
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body).containsEntry("message", "Password must be longer than 12 characters."));

        assertThat(authUserRepository.findAll()).isEmpty();
    }

    @Test
    void registrationAcceptsLongPasswordsWithinInternalLimit() {
        String longPassword = IntStream.range(0, 255)
                .mapToObj(index -> "a")
                .collect(Collectors.joining());

        var responseBody = register("owner@example.com", longPassword);

        assertThat(responseBody).containsEntry(
                "message",
                "If the address can be used, we sent a verification email."
        );
        assertThat(authUserRepository.findAll()).hasSize(1);
        assertThat(authUserRepository.findAll().getFirst().getPasswordHash()).startsWith("$argon2id$");
    }

    @Test
    void registrationRejectsPasswordsLongerThanTwoHundredFiftyFiveCharacters() {
        CsrfState csrf = fetchCsrfState();
        String tooLongPassword = IntStream.range(0, 256)
                .mapToObj(index -> "a")
                .collect(Collectors.joining());

        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", tooLongPassword
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body).containsEntry("message", "Password must be 255 characters or fewer."));

        assertThat(authUserRepository.findAll()).isEmpty();
    }

    @Test
    void reregisteringUnverifiedEmailReusesPendingAccountAndUpdatesPassword() {
        register("owner@example.com", "CorrectHorse1!");
        String originalHash = authUserRepository.findAll().getFirst().getPasswordHash();

        register("owner@example.com", "CorrectHorse2!");

        assertThat(authUserRepository.findAll()).hasSize(1);
        assertThat(authEmailVerificationTokenRepository.findAll()).hasSize(1);
        assertThat(authEmailSender.messagesOfType(EmailType.VERIFICATION)).hasSize(1);
        assertThat(authUserRepository.findAll().getFirst().getPasswordHash()).isNotEqualTo(originalHash);
    }

    @Test
    void reregisteringVerifiedEmailNoops() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        authEmailSender.clear();

        register("owner@example.com", "CorrectHorse2!");

        assertThat(authUserRepository.findAll()).hasSize(1);
        assertThat(authEmailVerificationTokenRepository.findAll()).hasSize(1);
        assertThat(authEmailSender.messages()).isEmpty();
    }

    @Test
    void loginReturnsSameUnauthorizedShapeForUnknownWrongAndUnverifiedAccounts() {
        Map<String, Object> unknown = loginExpectUnauthorized("unknown@example.com", "WrongPassword1!");

        register("owner@example.com", "CorrectHorse1!");
        Map<String, Object> unverified = loginExpectUnauthorized("owner@example.com", "CorrectHorse1!");

        verifyLatestEmailToken();
        Map<String, Object> wrongPassword = loginExpectUnauthorized("owner@example.com", "WrongPassword1!");

        assertThat(unknown).isEqualTo(unverified);
        assertThat(unverified).isEqualTo(wrongPassword);
        assertThat(unknown).containsEntry("message", "Invalid email or password.");
    }

    @Test
    void verificationSucceedsOnceAndLoginCreatesPersistentSession() {
        register("owner@example.com", "CorrectHorse1!");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String token = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        assertThat(verifyToken(token)).containsEntry("verified", true);

        AuthUserEntity user = authUserRepository.findAll().getFirst();
        assertThat(user.isEnabled()).isTrue();
        assertThat(user.getEmailVerifiedAt()).isNotNull();

        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!");
        expectAuthenticatedUser(sessionCookie, "owner@example.com");
        assertThat(awaitSessionCount()).isGreaterThan(0);

        CsrfState csrf = fetchCsrfState();
        restTestClient.post()
                .uri("/auth/logout")
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, combineCookies(sessionCookie, csrf.cookie()))
                .exchange()
                .expectStatus().isNoContent();

        restTestClient.get()
                .uri("/auth/me")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void sameBrowserVerificationAutoAuthenticatesAndClaimsReservedAudit() {
        String jobId = startAnonymousAudit("example.com");
        String claimToken = createClaimToken(jobId);

        CsrfState registrationCsrf = fetchCsrfState();
        var registerResult = restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!",
                        "claimToken", claimToken
                ))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class);

        String sessionCookie = extractCookie(registerResult.getResponseHeaders(), "seogeo_session");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        CsrfState verificationCsrf = fetchCsrfState(sessionCookie);
        var verificationResult = restTestClient.post()
                .uri("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", verificationCsrf.token())
                .header(HttpHeaders.COOKIE, verificationCsrf.cookie())
                .body(Map.of("token", verificationToken))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        assertThat(verificationResult.getResponseBody()).containsEntry("authenticated", true);

        String verifiedSessionCookie = extractCookie(verificationResult.getResponseHeaders(), "seogeo_session");
        expectAuthenticatedUser(verifiedSessionCookie, "owner@example.com");
        expectOwnedAudits(verifiedSessionCookie, jobId);

        restTestClient.get()
                .uri("/audits/{jobId}/report", jobId)
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void crossBrowserVerificationKeepsReservedClaimUntilLaterLogin() {
        String jobId = startAnonymousAudit("example.com");
        String claimToken = createClaimToken(jobId);

        CsrfState registrationCsrf = fetchCsrfState();
        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!",
                        "claimToken", claimToken
                ))
                .exchange()
                .expectStatus().isAccepted();

        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        Map<String, Object> verificationBody = verifyToken(verificationToken);
        assertThat(verificationBody).containsEntry("authenticated", false);

        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!");
        expectOwnedAudits(sessionCookie, jobId);

        restTestClient.get()
                .uri("/audits/{jobId}/report", jobId)
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void existingUserSignInWithClaimTokenClaimsAnonymousAudit() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();

        String jobId = startAnonymousAudit("example.com");
        String claimToken = createClaimToken(jobId);

        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!", claimToken);
        expectOwnedAudits(sessionCookie, jobId);

        restTestClient.get()
                .uri("/audits/{jobId}/report", jobId)
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void forgotPasswordCreatesResetTokenForVerifiedUserOnly() {
        register("owner@example.com", "CorrectHorse1!");

        var unknown = forgotPassword("unknown@example.com");
        assertThat(unknown).containsEntry("message", "If the address can be used, we sent a password reset email.");
        assertThat(authPasswordResetTokenRepository.findAll()).isEmpty();

        var unverified = forgotPassword("owner@example.com");
        assertThat(unverified).isEqualTo(unknown);
        assertThat(authPasswordResetTokenRepository.findAll()).isEmpty();

        verifyLatestEmailToken();
        var verified = forgotPassword("owner@example.com");
        assertThat(verified).isEqualTo(unknown);
        assertThat(authPasswordResetTokenRepository.findAll()).hasSize(1);
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);

        AuthPasswordResetTokenEntity token = authPasswordResetTokenRepository.findAll().getFirst();
        SentEmail passwordResetEmail = authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET);
        String rawToken = extractToken(passwordResetEmail.actionUrl());
        assertThat(passwordResetEmail.actionUrl())
                .isEqualTo("http://localhost:3000/auth/reset-password?status=ready#token=" + rawToken);
        assertThat(token.getTokenHash()).isNotEqualTo(rawToken);
    }

    @Test
    void concurrentPasswordResetRedeemOnlySucceedsOnce() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        forgotPassword("owner@example.com");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);

        String resetToken = extractToken(authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET).actionUrl());
        List<Object> outcomes = runConcurrently(
                () -> {
                    authService.resetPassword(resetToken, "CorrectHorse2!");
                    return "success";
                },
                () -> {
                    authService.resetPassword(resetToken, "CorrectHorse3!");
                    return "success";
                }
        );

        long successes = outcomes.stream().filter("success"::equals).count();
        long failures = outcomes.stream()
                .filter(AuthService.PasswordResetTokenException.class::isInstance)
                .count();

        assertThat(successes).isEqualTo(1);
        assertThat(failures).isEqualTo(1);
    }

    @Test
    void concurrentVerificationRedeemOnlySucceedsOnce() {
        register("owner@example.com", "CorrectHorse1!");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);

        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());
        List<Object> outcomes = runConcurrently(
                () -> {
                    authService.verifyEmailToken(
                            verificationToken,
                            new MockHttpServletRequest(),
                            new MockHttpServletResponse()
                    );
                    return "success";
                },
                () -> {
                    authService.verifyEmailToken(
                            verificationToken,
                            new MockHttpServletRequest(),
                            new MockHttpServletResponse()
                    );
                    return "success";
                }
        );

        long successes = outcomes.stream().filter("success"::equals).count();
        long failures = outcomes.stream()
                .filter(AuthService.VerificationTokenException.class::isInstance)
                .count();

        assertThat(successes).isEqualTo(1);
        assertThat(failures).isEqualTo(1);
    }

    @Test
    void concurrentRegistrationRequestsOnlyIssueOneFreshVerificationToken() {
        authEmailSender.clear();

        List<Object> outcomes = runConcurrently(
                () -> {
                    authService.register("owner@example.com", "CorrectHorse1!", null);
                    return "done";
                },
                () -> {
                    authService.register("owner@example.com", "CorrectHorse1!", null);
                    return "done";
                }
        );

        assertThat(outcomes).containsOnly("done");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        assertThat(authUserRepository.findAll()).hasSize(1);
        assertThat(authEmailSender.messagesOfType(EmailType.VERIFICATION)).hasSize(1);
        assertThat(authEmailVerificationTokenRepository.findAll()).hasSize(1);
    }

    @Test
    void concurrentForgotPasswordRequestsOnlyIssueOneFreshToken() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        authEmailSender.clear();

        List<Object> outcomes = runConcurrently(
                () -> {
                    authService.forgotPassword("owner@example.com");
                    return "done";
                },
                () -> {
                    authService.forgotPassword("owner@example.com");
                    return "done";
                }
        );

        assertThat(outcomes).containsOnly("done");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);
        assertThat(authEmailSender.messagesOfType(EmailType.PASSWORD_RESET)).hasSize(1);
        assertThat(authPasswordResetTokenRepository.findAll()).hasSize(1);
    }

    @Test
    void resetPasswordReplacesPasswordAndInvalidatesExistingSessions() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!");
        expectAuthenticatedUser(sessionCookie, "owner@example.com");

        forgotPassword("owner@example.com");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);
        String resetToken = extractToken(authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET).actionUrl());

        assertThat(resetPassword(resetToken, "CorrectHorse2!")).containsEntry("reset", true);

        restTestClient.get()
                .uri("/auth/me")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isUnauthorized();

        loginExpectUnauthorized("owner@example.com", "CorrectHorse1!");
        String newSessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse2!");
        expectAuthenticatedUser(newSessionCookie, "owner@example.com");
    }

    @Test
    void invalidExpiredUsedAndSupersededVerificationTokensShareTheSameApiFailureResponse() {
        register("owner@example.com", "CorrectHorse1!");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        AuthEmailVerificationTokenEntity token = authEmailVerificationTokenRepository.findAll().getFirst();
        String rawToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        Map<String, Object> invalid = verifyExpectBadRequest("missing-token");

        token.setUsedAt(OffsetDateTime.now().minusMinutes(1));
        authEmailVerificationTokenRepository.save(token);
        Map<String, Object> used = verifyExpectBadRequest(rawToken);

        token.setUsedAt(null);
        token.setSupersededAt(OffsetDateTime.now().minusMinutes(1));
        authEmailVerificationTokenRepository.save(token);
        Map<String, Object> superseded = verifyExpectBadRequest(rawToken);

        token.setSupersededAt(null);
        token.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        authEmailVerificationTokenRepository.save(token);
        Map<String, Object> expired = verifyExpectBadRequest(rawToken);

        assertThat(invalid).isEqualTo(used);
        assertThat(used).isEqualTo(superseded);
        assertThat(superseded).isEqualTo(expired);
    }

    @Test
    void invalidExpiredUsedAndSupersededResetTokensShareTheSameApiFailureResponse() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        forgotPassword("owner@example.com");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);

        AuthPasswordResetTokenEntity token = authPasswordResetTokenRepository.findAll().getFirst();
        String rawToken = extractToken(authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET).actionUrl());

        Map<String, Object> invalid = resetExpectBadRequest("missing-token", "CorrectHorse2!");

        token.setUsedAt(OffsetDateTime.now().minusMinutes(1));
        authPasswordResetTokenRepository.save(token);
        Map<String, Object> used = resetExpectBadRequest(rawToken, "CorrectHorse2!");

        token.setUsedAt(null);
        token.setSupersededAt(OffsetDateTime.now().minusMinutes(1));
        authPasswordResetTokenRepository.save(token);
        Map<String, Object> superseded = resetExpectBadRequest(rawToken, "CorrectHorse2!");

        token.setSupersededAt(null);
        token.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        authPasswordResetTokenRepository.save(token);
        Map<String, Object> expired = resetExpectBadRequest(rawToken, "CorrectHorse2!");

        assertThat(invalid).isEqualTo(used);
        assertThat(used).isEqualTo(superseded);
        assertThat(superseded).isEqualTo(expired);
    }

    @Test
    void verifyEmailAndResetLinksRedirectToFrontendStatusPages() {
        register("owner@example.com", "CorrectHorse1!");
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        var successResult = restTestClient.get()
                .uri("/auth/verify-email-link?token={token}", verificationToken)
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.SEE_OTHER)
                .returnResult(Void.class);

        assertThat(successResult.getResponseHeaders().getFirst(HttpHeaders.LOCATION))
                .isEqualTo("http://localhost:3000/auth/verify-email?status=ready#token=" + verificationToken);
        assertThat(authUserRepository.findAll().getFirst().isEnabled()).isFalse();

        var invalidVerifyResult = restTestClient.get()
                .uri("/auth/verify-email-link?token=missing-token")
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.SEE_OTHER)
                .returnResult(Void.class);

        assertThat(invalidVerifyResult.getResponseHeaders().getFirst(HttpHeaders.LOCATION))
                .isEqualTo("http://localhost:3000/auth/verify-email?status=invalid");

        verifyLatestEmailToken();
        forgotPassword("owner@example.com");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);
        String resetToken = extractToken(authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET).actionUrl());

        var resetReadyResult = restTestClient.get()
                .uri("/auth/reset-password-link?token={token}", resetToken)
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.SEE_OTHER)
                .returnResult(Void.class);

        assertThat(resetReadyResult.getResponseHeaders().getFirst(HttpHeaders.LOCATION))
                .isEqualTo("http://localhost:3000/auth/reset-password?status=ready#token=" + resetToken);

        var invalidResetResult = restTestClient.get()
                .uri("/auth/reset-password-link?token=missing-token")
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.SEE_OTHER)
                .returnResult(Void.class);

        assertThat(invalidResetResult.getResponseHeaders().getFirst(HttpHeaders.LOCATION))
                .isEqualTo("http://localhost:3000/auth/reset-password?status=invalid");
    }

    private Map<String, Object> register(String email, String password) {
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

    private void verifyLatestEmailToken() {
        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        verifyToken(extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl()));
    }

    private Map<String, Object> forgotPassword(String email) {
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

    private String loginAndExtractSessionCookie(String email, String password) {
        return loginAndExtractSessionCookie(email, password, null);
    }

    private String loginAndExtractSessionCookie(String email, String password, String claimToken) {
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

    private void expectAuthenticatedUser(String sessionCookie, String expectedEmail) {
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

    private Map<String, Object> loginExpectUnauthorized(String email, String password) {
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

    private Map<String, Object> verifyToken(String token) {
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

    private Map<String, Object> verifyExpectBadRequest(String token) {
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

    private Map<String, Object> resetPassword(String token, String password) {
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

    private Map<String, Object> resetExpectBadRequest(String token, String password) {
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

    private static String extractToken(String actionUrl) {
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

    private CsrfState fetchCsrfState(String... existingCookies) {
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

    private String startAnonymousAudit(String url) {
        Map<String, Object> responseBody = restTestClient.post()
                .uri("/audits")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("url", url))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class)
                .getResponseBody();
        return String.valueOf(responseBody.get("jobId"));
    }

    private String createClaimToken(String jobId) {
        Map<String, Object> responseBody = restTestClient.post()
                .uri("/audits/{jobId}/claim-tokens", jobId)
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class)
                .getResponseBody();
        return String.valueOf(responseBody.get("token"));
    }

    private void expectOwnedAudits(String sessionCookie, String expectedJobId) {
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

    private String extractCookie(HttpHeaders headers, String cookieName) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotNull();
        return cookies.stream()
                .map(cookie -> cookie.split(";", 2)[0])
                .filter(cookie -> cookie.startsWith(cookieName + "="))
                .findFirst()
                .orElseThrow();
    }

    private void awaitEmailsOfType(EmailType emailType, int expectedCount) {
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

    private static String combineCookies(String... cookies) {
        return Arrays.stream(cookies)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("; "));
    }

    private int awaitSessionCount() {
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
    private List<Object> runConcurrently(Callable<Object>... tasks) {
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

    @TestConfiguration
    static class AuthTestConfiguration {

        @Bean
        @Primary
        CapturingAuthEmailSender verificationEmailSender() {
            return new CapturingAuthEmailSender();
        }
    }

    enum EmailType {
        VERIFICATION,
        PASSWORD_RESET
    }

    static final class CapturingAuthEmailSender implements AuthEmailSender {

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

    record SentEmail(EmailType emailType, String recipientEmail, String actionUrl, OffsetDateTime expiresAt) {
    }

    record CsrfState(String token, String cookie) {
    }
}
