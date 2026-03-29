package com.nabin.seogeo.auth;

import com.nabin.seogeo.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class AuthConcurrencyIntegrationTests extends AbstractAuthIntegrationTest {

    @Test
    void concurrentPasswordResetRedeemOnlySucceedsOnce() {
        register("owner@example.com", "CorrectHorse1!");
        verifyLatestEmailToken();
        forgotPassword("owner@example.com");
        awaitEmailsOfType(EmailType.PASSWORD_RESET, 1);

        String resetToken = extractToken(authEmailSender.lastEmailOfType(EmailType.PASSWORD_RESET).actionUrl());
        var outcomes = runConcurrently(
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
        var outcomes = runConcurrently(
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

        var outcomes = runConcurrently(
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

        var outcomes = runConcurrently(
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
}
