package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class AuthRegistrationIntegrationTests extends AbstractAuthIntegrationTest {

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
        var tokens = authEmailVerificationTokenRepository.findAll();
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
    void reregisteringVerifiedEmailReturnsConflictWithoutChangingPasswordOrVerificationState() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        String originalHash = authUserRepository.findAll().getFirst().getPasswordHash();
        authEmailSender.clear();

        CsrfState csrf = fetchCsrfState();
        restTestClient.post()
                .uri("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of(
                        "email", "owner@example.com",
                        "password", "CorrectHorse2!"
                ))
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.CONFLICT)
                .expectBody(Map.class)
                .value(body -> assertThat(body)
                        .containsEntry("error", "EMAIL_ALREADY_REGISTERED")
                        .containsEntry("message", AuthService.EMAIL_ALREADY_REGISTERED_MESSAGE));

        assertThat(authUserRepository.findAll()).hasSize(1);
        assertThat(authEmailVerificationTokenRepository.findAll()).hasSize(1);
        assertThat(authUserRepository.findAll().getFirst().getPasswordHash()).isEqualTo(originalHash);
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
}
