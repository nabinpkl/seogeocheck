package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenEntity;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenEntity;
import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class AuthRecoveryIntegrationTests extends AbstractAuthIntegrationTest {

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

    @Test
    void deleteAccountRemovesOwnedDataReservedClaimsAndSessions() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        String sessionCookie = loginAndExtractSessionCookie("owner@example.com", "CorrectHorse1!");
        UUID userId = authUserRepository.findAll().getFirst().getId();
        UUID projectId = UUID.randomUUID();
        UUID trackedUrlId = UUID.randomUUID();
        UUID ownedClaimTokenId = UUID.randomUUID();
        UUID reservedClaimTokenId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        jdbcTemplate.update(
                """
                insert into auth_password_reset_tokens (
                    id, user_id, token_hash, expires_at, created_at, sent_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                userId,
                "reset-token-hash",
                now.plusHours(1),
                now,
                now
        );
        jdbcTemplate.update(
                """
                insert into audit_runs (
                    job_id, target_url, status, created_at, completed_at, owner_user_id
                ) values (?, ?, ?, ?, ?, ?)
                """,
                "owned-job",
                "https://example.com",
                "VERIFIED",
                now.minusMinutes(4),
                now.minusMinutes(3),
                userId
        );
        jdbcTemplate.update(
                """
                insert into audit_events (
                    job_id, sequence, event_type, status, payload_json, created_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                "owned-job",
                1L,
                "progress",
                "VERIFIED",
                "{\"message\":\"done\"}",
                now.minusMinutes(4)
        );
        jdbcTemplate.update(
                """
                insert into audit_reports (
                    job_id, generated_at, report_json, signature_algorithm, signature_value
                ) values (?, ?, ?, ?, ?)
                """,
                "owned-job",
                now.minusMinutes(3),
                "{\"report\":true}",
                "HS256",
                "signature"
        );
        jdbcTemplate.update(
                """
                insert into audit_run_summaries (
                    job_id, score, high_issue_count, issue_count, passed_check_count,
                    not_applicable_count, system_error_count, generated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                "owned-job",
                82,
                1,
                3,
                10,
                1,
                0,
                now.minusMinutes(3)
        );
        jdbcTemplate.update(
                """
                insert into audit_run_summary_high_issues (
                    job_id, issue_key, issue_label, issue_instruction, severity
                ) values (?, ?, ?, ?, ?)
                """,
                "owned-job",
                "title-missing",
                "Title missing",
                "Add a unique title tag.",
                "high"
        );
        jdbcTemplate.update(
                """
                insert into projects (
                    id, owner_user_id, name, slug, description, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                projectId,
                userId,
                "Main project",
                "main-project",
                "Owned by account",
                now.minusMinutes(5),
                now.minusMinutes(5)
        );
        jdbcTemplate.update(
                """
                insert into project_tracked_urls (
                    id, project_id, normalized_url, normalized_host, normalized_path,
                    display_url, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                trackedUrlId,
                projectId,
                "https://example.com/",
                "example.com",
                "/",
                "https://example.com",
                now.minusMinutes(5),
                now.minusMinutes(5)
        );
        jdbcTemplate.update(
                """
                insert into audit_project_links (
                    job_id, project_id, tracked_url_id, linked_at, linked_by_user_id
                ) values (?, ?, ?, ?, ?)
                """,
                "owned-job",
                projectId,
                trackedUrlId,
                now.minusMinutes(3),
                userId
        );
        jdbcTemplate.update(
                """
                insert into audit_claim_tokens (
                    id, job_id, token_hash, reserved_user_id, expires_at, created_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                ownedClaimTokenId,
                "owned-job",
                "owned-claim-hash",
                userId,
                now.plusHours(1),
                now.minusMinutes(2)
        );
        jdbcTemplate.update(
                """
                insert into audit_runs (
                    job_id, target_url, status, created_at
                ) values (?, ?, ?, ?)
                """,
                "foreign-job",
                "https://reserved.example.com",
                "QUEUED",
                now.minusMinutes(2)
        );
        jdbcTemplate.update(
                """
                insert into audit_claim_tokens (
                    id, job_id, token_hash, reserved_user_id, expires_at, created_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                reservedClaimTokenId,
                "foreign-job",
                "reserved-claim-hash",
                userId,
                now.plusHours(1),
                now.minusMinutes(1)
        );

        deleteAccount(sessionCookie);

        restTestClient.get()
                .uri("/auth/me")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isUnauthorized();

        assertThat(authUserRepository.findAll()).isEmpty();
        assertThat(authEmailVerificationTokenRepository.findAll()).isEmpty();
        assertThat(authPasswordResetTokenRepository.findAll()).isEmpty();
        assertThat(jdbcTemplate.queryForObject("select count(*) from projects", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from project_tracked_urls", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_project_links", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_events where job_id = 'owned-job'", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_reports where job_id = 'owned-job'", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_run_summaries where job_id = 'owned-job'", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_run_summary_high_issues where job_id = 'owned-job'", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_runs where job_id = 'owned-job'", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_claim_tokens", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_runs where job_id = 'foreign-job'", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from spring_session where principal_name = ?",
                Integer.class,
                userId.toString()
        )).isZero();
    }
}
