package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class AuthAnonymousWorkspaceIntegrationTests extends AbstractAuthIntegrationTest {

    @Test
    void startingAuditIssuesClaimTokenWithoutCreatingGuestWorkspace() {
        StartedAudit startedAudit = startVisitorAudit("example.com");

        assertThat(startedAudit.claimToken()).isNotBlank();
        assertThat(startedAudit.sessionCookie()).isNull();
        assertThat(authUserRepository.findAll()).isEmpty();

        restTestClient.get()
                .uri("/audits/{jobId}/report", startedAudit.jobId())
                .exchange()
                .expectStatus().isNotFound();

        restTestClient.get()
                .uri("/audits/{jobId}/report?claim={claim}", startedAudit.jobId(), startedAudit.claimToken())
                .exchange()
                .expectStatus().isAccepted();

        restTestClient.get()
                .uri("/account/audits")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void continuingAsGuestClaimsVisitorAuditAndOpensWorkspace() {
        StartedAudit startedAudit = startVisitorAudit("example.com");

        String sessionCookie = continueAsGuestAndExtractSessionCookie(startedAudit.claimToken());

        restTestClient.get()
                .uri("/auth/me")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body.get("email")).isNull();
                    assertThat(body.get("accountKind")).isEqualTo("ANONYMOUS");
                    assertThat(body.get("isAnonymous")).isEqualTo(true);
                    assertThat(body.get("emailVerified")).isEqualTo(false);
                });

        expectOwnedAudits(sessionCookie, startedAudit.jobId());

        restTestClient.get()
                .uri("/account/projects")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(1);
                    Map<String, Object> project = (Map<String, Object>) body.getFirst();
                    assertThat(project.get("isDefault")).isEqualTo(true);
                    assertThat(project.get("auditCount")).isEqualTo(1);
                });

        restTestClient.get()
                .uri("/audits/{jobId}/report", startedAudit.jobId())
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isAccepted();
    }

    @Test
    void sameBrowserVerificationAutoAuthenticatesAndKeepsGuestWorkspace() {
        StartedAudit startedAudit = startVisitorAudit("example.com");
        String guestSessionCookie = continueAsGuestAndExtractSessionCookie(startedAudit.claimToken());

        CsrfState registrationCsrf = fetchCsrfState(guestSessionCookie);
        var registerResult = restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!"
                ))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class);

        String sessionCookie = extractCookieOrFallback(
                registerResult.getResponseHeaders(),
                "seogeo_session",
                guestSessionCookie
        );
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
        expectOwnedAudits(verifiedSessionCookie, startedAudit.jobId());
        assertThat(authUserRepository.findAll()).hasSize(1);

        restTestClient.get()
                .uri("/audits/{jobId}/report", startedAudit.jobId())
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void crossBrowserVerificationDoesNotAutoAuthenticateButLoginStillSeesConvertedWorkspace() {
        StartedAudit startedAudit = startVisitorAudit("example.com");
        String guestSessionCookie = continueAsGuestAndExtractSessionCookie(startedAudit.claimToken());

        CsrfState registrationCsrf = fetchCsrfState(guestSessionCookie);
        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!"
                ))
                .exchange()
                .expectStatus().isAccepted();

        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());

        Map<String, Object> verificationBody = verifyToken(verificationToken);
        assertThat(verificationBody).containsEntry("authenticated", false);

        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!");
        expectOwnedAudits(sessionCookie, startedAudit.jobId());

        restTestClient.get()
                .uri("/audits/{jobId}/report", startedAudit.jobId())
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void guestSignupWithExistingVerifiedEmailRequiresSignInThenMergesWorkspace() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();

        StartedAudit startedAudit = startVisitorAudit("example.com");
        String guestSessionCookie = continueAsGuestAndExtractSessionCookie(startedAudit.claimToken());
        CsrfState registrationCsrf = fetchCsrfState(guestSessionCookie);
        var registerResult = restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse2!"
                ))
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.CONFLICT)
                .returnResult(Map.class);
        assertThat(registerResult.getResponseBody()).containsEntry("error", "EMAIL_ALREADY_REGISTERED");

        String mergeSessionCookie = extractCookieOrFallback(
                registerResult.getResponseHeaders(),
                "seogeo_session",
                guestSessionCookie
        );
        CsrfState loginCsrf = fetchCsrfState(mergeSessionCookie);
        var loginResult = restTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", loginCsrf.token())
                .header(HttpHeaders.COOKIE, loginCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse1!"
                ))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        String sessionCookie = extractCookie(loginResult.getResponseHeaders(), "seogeo_session");
        expectOwnedAudits(sessionCookie, startedAudit.jobId());
        assertThat(authUserRepository.findAll()).hasSize(1);
    }

    @Test
    void guestSignupWithExistingUnverifiedEmailReusesPendingAccountAndMergesAfterVerification() {
        register("owner@example.com", "CorrectHorse1!");
        String originalHash = authUserRepository.findByEmailNormalized("owner@example.com").orElseThrow().getPasswordHash();

        StartedAudit startedAudit = startVisitorAudit("example.com");
        String guestSessionCookie = continueAsGuestAndExtractSessionCookie(startedAudit.claimToken());
        CsrfState registrationCsrf = fetchCsrfState(guestSessionCookie);
        var registerResult = restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", registrationCsrf.token())
                .header(HttpHeaders.COOKIE, registrationCsrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse2!"
                ))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class);
        String mergeSessionCookie = extractCookieOrFallback(
                registerResult.getResponseHeaders(),
                "seogeo_session",
                guestSessionCookie
        );

        AuthUserEntity pendingUser = authUserRepository.findByEmailNormalized("owner@example.com").orElseThrow();
        assertThat(authUserRepository.findAll()).hasSize(2);
        assertThat(pendingUser.getPasswordHash()).isNotEqualTo(originalHash);

        awaitEmailsOfType(EmailType.VERIFICATION, 1);
        String verificationToken = extractToken(authEmailSender.lastEmailOfType(EmailType.VERIFICATION).actionUrl());
        CsrfState verificationCsrf = fetchCsrfState(mergeSessionCookie);
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
        String sessionCookie = extractCookie(verificationResult.getResponseHeaders(), "seogeo_session");
        expectOwnedAudits(sessionCookie, startedAudit.jobId());
        assertThat(authUserRepository.findAll()).hasSize(1);
        loginExpectUnauthorized("owner@example.com", "CorrectHorse1!");
        String newSessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse2!");
        expectAuthenticatedUser(newSessionCookie, "owner@example.com");
    }
}
