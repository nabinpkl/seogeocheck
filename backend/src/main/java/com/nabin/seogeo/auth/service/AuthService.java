package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.config.AuthProperties;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.mail.AuthEmailSender;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenEntity;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenEntity;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    public static final String GENERIC_REGISTER_MESSAGE = "If the address can be used, we sent a verification email.";
    public static final String GENERIC_LOGIN_MESSAGE = "Invalid email or password.";
    public static final String GENERIC_VERIFICATION_MESSAGE = "The verification link is invalid or has expired.";
    public static final String GENERIC_FORGOT_PASSWORD_MESSAGE = "If the address can be used, we sent a password reset email.";
    public static final String GENERIC_RESET_MESSAGE = "The password reset link is invalid or has expired.";

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MIN_PASSWORD_LENGTH = 13;
    private static final int MAX_PASSWORD_LENGTH = 255;
    private static final Duration UNKNOWN_USER_LOGIN_DELAY = Duration.ofMillis(500);
    private static final Duration PUBLIC_AUTH_RESPONSE_FLOOR = Duration.ofMillis(400);

    private final AuthUserRepository authUserRepository;
    private final AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository;
    private final AuthPasswordResetTokenRepository authPasswordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthEmailSender authEmailSender;
    private final AuthProperties authProperties;
    private final Clock clock;
    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy;

    public AuthService(
            AuthUserRepository authUserRepository,
            AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository,
            AuthPasswordResetTokenRepository authPasswordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthEmailSender authEmailSender,
            AuthProperties authProperties,
            Clock clock,
            JdbcTemplate jdbcTemplate,
            PlatformTransactionManager transactionManager,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            SecurityContextRepository securityContextRepository,
            SecurityContextHolderStrategy securityContextHolderStrategy
    ) {
        this.authUserRepository = authUserRepository;
        this.authEmailVerificationTokenRepository = authEmailVerificationTokenRepository;
        this.authPasswordResetTokenRepository = authPasswordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authEmailSender = authEmailSender;
        this.authProperties = authProperties;
        this.clock = clock;
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
        this.securityContextHolderStrategy = securityContextHolderStrategy;
    }

    public void register(String rawEmail, String rawPassword) {
        OffsetDateTime startedAt = now();
        String emailOriginal = normalizeOriginalEmail(rawEmail);
        String emailNormalized = normalizeEmail(rawEmail);
        validatePassword(rawPassword);

        try {
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    transactionTemplate.executeWithoutResult(status -> registerInTransaction(emailOriginal, emailNormalized, rawPassword));
                    return;
                } catch (DataIntegrityViolationException dataIntegrityViolationException) {
                    if (attempt == 1) {
                        throw dataIntegrityViolationException;
                    }
                }
            }
        } finally {
            enforcePublicResponseFloor(startedAt);
        }
    }

    @Transactional
    void registerInTransaction(String emailOriginal, String emailNormalized, String rawPassword) {
        OffsetDateTime now = now();
        Optional<AuthUserEntity> existingUser = authUserRepository.findByEmailNormalizedForUpdate(emailNormalized);
        if (existingUser.isPresent()) {
            AuthUserEntity user = existingUser.get();
            if (isVerified(user)) {
                return;
            }

            user.setEmailOriginal(emailOriginal);
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            user.setUpdatedAt(now);
            authUserRepository.save(user);
            issueVerificationIfAllowed(user, now);
            return;
        }

        AuthUserEntity user = new AuthUserEntity();
        user.setId(UUID.randomUUID());
        user.setEmailNormalized(emailNormalized);
        user.setEmailOriginal(emailOriginal);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEnabled(false);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setFailedLoginCount(0);
        authUserRepository.saveAndFlush(user);
        issueVerificationIfAllowed(user, now);
    }

    @Transactional
    public AuthenticatedUser login(
            String rawEmail,
            String rawPassword,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String emailNormalized = normalizeEmail(rawEmail);
        Optional<AuthUserEntity> userOptional = authUserRepository.findByEmailNormalized(emailNormalized);
        if (userOptional.isEmpty()) {
            sleep(UNKNOWN_USER_LOGIN_DELAY);
            throw new InvalidCredentialsException();
        }

        AuthUserEntity user = userOptional.get();
        if (!isVerified(user)) {
            passwordEncoder.matches(rawPassword, user.getPasswordHash());
            int failureCount = registerFailedLogin(user);
            sleep(calculateExistingUserDelay(failureCount));
            throw new InvalidCredentialsException();
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            int failureCount = registerFailedLogin(user);
            sleep(calculateExistingUserDelay(failureCount));
            throw new InvalidCredentialsException();
        }

        OffsetDateTime now = now();
        user.setFailedLoginCount(0);
        user.setFailedLoginWindowStartedAt(null);
        user.setLastLoginAt(now);
        user.setUpdatedAt(now);
        authUserRepository.save(user);

        AuthenticatedUser authenticatedUser = toAuthenticatedUser(user);
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                authenticatedUser,
                null,
                AuthorityUtils.createAuthorityList("ROLE_USER")
        );
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return authenticatedUser;
    }

    @Transactional
    public void forgotPassword(String rawEmail) {
        OffsetDateTime startedAt = now();
        try {
            String emailNormalized = normalizeEmail(rawEmail);
            Optional<AuthUserEntity> userOptional = authUserRepository.findByEmailNormalizedForUpdate(emailNormalized);
            if (userOptional.isEmpty()) {
                return;
            }

            AuthUserEntity user = userOptional.get();
            if (!isVerified(user)) {
                return;
            }
            issuePasswordResetIfAllowed(user, now());
        } finally {
            enforcePublicResponseFloor(startedAt);
        }
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(
                request,
                response,
                securityContextHolderStrategy.getContext().getAuthentication()
        );
    }

    @Transactional
    public void verifyEmailToken(String rawToken) {
        OffsetDateTime now = now();
        AuthEmailVerificationTokenEntity token = claimVerificationToken(rawToken, now);
        AuthUserEntity user = authUserRepository.findById(token.getUserId())
                .orElseThrow(() -> new VerificationTokenException(VerificationFailureReason.INVALID));

        user.setEnabled(true);
        user.setEmailVerifiedAt(now);
        user.setUpdatedAt(now);
        authUserRepository.save(user);

        supersedeActiveVerificationTokens(user.getId(), now, token.getId());
    }

    public void assertVerificationTokenIsUsable(String rawToken) {
        resolveActiveVerificationToken(rawToken);
    }

    public void assertPasswordResetTokenIsUsable(String rawToken) {
        resolveActivePasswordResetToken(rawToken);
    }

    @Transactional
    public void resetPassword(String rawToken, String rawPassword) {
        validatePassword(rawPassword);

        OffsetDateTime now = now();
        AuthPasswordResetTokenEntity token = claimPasswordResetToken(rawToken, now);
        AuthUserEntity user = authUserRepository.findById(token.getUserId())
                .orElseThrow(() -> new PasswordResetTokenException(PasswordResetFailureReason.INVALID));

        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFailedLoginCount(0);
        user.setFailedLoginWindowStartedAt(null);
        user.setUpdatedAt(now);
        authUserRepository.save(user);

        supersedeActivePasswordResetTokens(user.getId(), now, token.getId());
        deleteSessionsForPrincipal(user.getEmailOriginal());
    }

    public String buildFrontendVerificationRedirect(VerificationFailureReason failureReason) {
        String status = switch (failureReason) {
            case EXPIRED -> "expired";
            case INVALID -> "invalid";
        };
        return appendStatusToFrontendPath("/auth/verify-email", status, null);
    }

    public String buildFrontendVerificationSuccessRedirect() {
        return appendStatusToFrontendPath("/auth/verify-email", "success", null);
    }

    public String buildFrontendVerificationReadyRedirect(String rawToken) {
        return appendStatusToFrontendPath("/auth/verify-email", "ready", rawToken);
    }

    public String buildFrontendPasswordResetReadyRedirect(String rawToken) {
        return appendStatusToFrontendPath("/auth/reset-password", "ready", rawToken);
    }

    public String buildFrontendPasswordResetFailureRedirect(PasswordResetFailureReason failureReason) {
        String status = switch (failureReason) {
            case EXPIRED -> "expired";
            case INVALID -> "invalid";
        };
        return appendStatusToFrontendPath("/auth/reset-password", status, null);
    }

    public AuthenticatedUser requireAuthenticatedUser(Object principal) {
        if (principal instanceof AuthenticatedUser authenticatedUser) {
            return authenticatedUser;
        }
        throw new InvalidCredentialsException();
    }

    private void issueVerificationIfAllowed(AuthUserEntity user, OffsetDateTime now) {
        AuthUserEntity lockedUser = authUserRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new IllegalStateException("Auth user missing during verification issuance"));
        AuthEmailVerificationTokenEntity activeToken = authEmailVerificationTokenRepository
                .findFirstByUserIdAndUsedAtIsNullAndSupersededAtIsNullAndExpiresAtAfterOrderBySentAtDesc(
                        lockedUser.getId(),
                        now
                )
                .orElse(null);

        if (activeToken != null && activeToken.getSentAt().plus(authProperties.getVerificationSendCooldown()).isAfter(now)) {
            return;
        }
        if (authEmailVerificationTokenRepository.countByUserIdAndSentAtAfter(lockedUser.getId(), now.minusHours(1))
                >= authProperties.getVerificationMaxSendsPerHour()) {
            return;
        }

        supersedeActiveVerificationTokens(lockedUser.getId(), now, null);

        String rawToken = generateRawToken();
        AuthEmailVerificationTokenEntity token = new AuthEmailVerificationTokenEntity();
        token.setId(UUID.randomUUID());
        token.setUserId(lockedUser.getId());
        token.setTokenHash(hashToken(rawToken));
        token.setCreatedAt(now);
        token.setSentAt(now);
        token.setExpiresAt(now.plus(authProperties.getVerificationTokenTtl()));
        authEmailVerificationTokenRepository.save(token);

        sendAfterCommit(() -> authEmailSender.sendVerificationEmail(
                lockedUser.getEmailOriginal(),
                buildVerificationUrl(rawToken),
                token.getExpiresAt()
        ));
    }

    private void issuePasswordResetIfAllowed(AuthUserEntity user, OffsetDateTime now) {
        AuthUserEntity lockedUser = authUserRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new IllegalStateException("Auth user missing during password reset issuance"));
        AuthPasswordResetTokenEntity activeToken = authPasswordResetTokenRepository
                .findFirstByUserIdAndUsedAtIsNullAndSupersededAtIsNullAndExpiresAtAfterOrderBySentAtDesc(
                        lockedUser.getId(),
                        now
                )
                .orElse(null);

        if (activeToken != null && activeToken.getSentAt().plus(authProperties.getResetSendCooldown()).isAfter(now)) {
            return;
        }
        if (authPasswordResetTokenRepository.countByUserIdAndSentAtAfter(lockedUser.getId(), now.minusHours(1))
                >= authProperties.getResetMaxSendsPerHour()) {
            return;
        }

        supersedeActivePasswordResetTokens(lockedUser.getId(), now, null);

        String rawToken = generateRawToken();
        AuthPasswordResetTokenEntity token = new AuthPasswordResetTokenEntity();
        token.setId(UUID.randomUUID());
        token.setUserId(lockedUser.getId());
        token.setTokenHash(hashToken(rawToken));
        token.setCreatedAt(now);
        token.setSentAt(now);
        token.setExpiresAt(now.plus(authProperties.getResetTokenTtl()));
        authPasswordResetTokenRepository.save(token);

        sendAfterCommit(() -> authEmailSender.sendPasswordResetEmail(
                lockedUser.getEmailOriginal(),
                buildPasswordResetUrl(rawToken),
                token.getExpiresAt()
        ));
    }

    private void supersedeActiveVerificationTokens(UUID userId, OffsetDateTime now, UUID excludeTokenId) {
        List<AuthEmailVerificationTokenEntity> activeTokens = authEmailVerificationTokenRepository
                .findByUserIdAndUsedAtIsNullAndSupersededAtIsNull(userId);
        for (AuthEmailVerificationTokenEntity activeToken : activeTokens) {
            if (excludeTokenId != null && excludeTokenId.equals(activeToken.getId())) {
                continue;
            }
            activeToken.setSupersededAt(now);
        }
        authEmailVerificationTokenRepository.saveAll(activeTokens);
    }

    private void supersedeActivePasswordResetTokens(UUID userId, OffsetDateTime now, UUID excludeTokenId) {
        List<AuthPasswordResetTokenEntity> activeTokens = authPasswordResetTokenRepository
                .findByUserIdAndUsedAtIsNullAndSupersededAtIsNull(userId);
        for (AuthPasswordResetTokenEntity activeToken : activeTokens) {
            if (excludeTokenId != null && excludeTokenId.equals(activeToken.getId())) {
                continue;
            }
            activeToken.setSupersededAt(now);
        }
        authPasswordResetTokenRepository.saveAll(activeTokens);
    }

    private int registerFailedLogin(AuthUserEntity user) {
        OffsetDateTime now = now();
        OffsetDateTime windowStart = user.getFailedLoginWindowStartedAt();
        if (windowStart == null || windowStart.plus(authProperties.getFailedLoginWindow()).isBefore(now)) {
            user.setFailedLoginWindowStartedAt(now);
            user.setFailedLoginCount(1);
        } else {
            user.setFailedLoginCount(user.getFailedLoginCount() + 1);
        }
        user.setUpdatedAt(now);
        authUserRepository.save(user);
        return user.getFailedLoginCount();
    }

    private Duration calculateExistingUserDelay(int failureCount) {
        if (failureCount <= 2) {
            return Duration.ZERO;
        }
        long exponentDelaySeconds = 1L << (failureCount - 3);
        long boundedSeconds = Math.min(
                exponentDelaySeconds,
                Math.max(0L, authProperties.getFailedLoginMaxDelay().toSeconds())
        );
        return Duration.ofSeconds(boundedSeconds);
    }

    private String buildVerificationUrl(String rawToken) {
        return buildFrontendReadyUrl("/auth/verify-email", rawToken);
    }

    private String buildPasswordResetUrl(String rawToken) {
        return buildFrontendReadyUrl("/auth/reset-password", rawToken);
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

    private String buildFrontendReadyUrl(String path, String rawToken) {
        return appendStatusToFrontendPath(path, "ready", rawToken);
    }

    private static void validatePassword(String rawPassword) {
        int characterLength = rawPassword.codePointCount(0, rawPassword.length());
        if (characterLength < MIN_PASSWORD_LENGTH) {
            throw new InvalidPasswordException("Password must be longer than 12 characters.");
        }
        if (characterLength > MAX_PASSWORD_LENGTH) {
            throw new InvalidPasswordException("Password must be 255 characters or fewer.");
        }
    }

    private static String normalizeOriginalEmail(String rawEmail) {
        return rawEmail == null ? "" : rawEmail.trim();
    }

    private static String normalizeEmail(String rawEmail) {
        return normalizeOriginalEmail(rawEmail).toLowerCase(Locale.ROOT);
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        SecureRandomHolder.INSTANCE.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 must be available", exception);
        }
    }

    private static void sleep(Duration duration) {
        if (duration.isZero() || duration.isNegative()) {
            return;
        }
        try {
            Thread.sleep(duration);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private static boolean isVerified(AuthUserEntity user) {
        return user.isEnabled() && user.getEmailVerifiedAt() != null;
    }

    private AuthEmailVerificationTokenEntity claimVerificationToken(String rawToken, OffsetDateTime now) {
        AuthEmailVerificationTokenEntity token = resolveActiveVerificationToken(rawToken);
        int updatedRows = authEmailVerificationTokenRepository.markUsedIfActive(token.getId(), now);
        if (updatedRows == 1) {
            return token;
        }
        throw verificationFailureAfterClaimRace(token.getId(), now);
    }

    private AuthEmailVerificationTokenEntity resolveActiveVerificationToken(String rawToken) {
        AuthEmailVerificationTokenEntity token = authEmailVerificationTokenRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new VerificationTokenException(VerificationFailureReason.INVALID));

        if (token.getUsedAt() != null || token.getSupersededAt() != null) {
            throw new VerificationTokenException(VerificationFailureReason.INVALID);
        }
        if (token.getExpiresAt().isBefore(now())) {
            throw new VerificationTokenException(VerificationFailureReason.EXPIRED);
        }
        return token;
    }

    private AuthService.VerificationTokenException verificationFailureAfterClaimRace(UUID tokenId, OffsetDateTime now) {
        return authEmailVerificationTokenRepository.findById(tokenId)
                .map(token -> {
                    if (token.getExpiresAt().isBefore(now)) {
                        return new VerificationTokenException(VerificationFailureReason.EXPIRED);
                    }
                    return new VerificationTokenException(VerificationFailureReason.INVALID);
                })
                .orElseGet(() -> new VerificationTokenException(VerificationFailureReason.INVALID));
    }

    private AuthPasswordResetTokenEntity claimPasswordResetToken(String rawToken, OffsetDateTime now) {
        AuthPasswordResetTokenEntity token = resolveActivePasswordResetToken(rawToken);
        int updatedRows = authPasswordResetTokenRepository.markUsedIfActive(token.getId(), now);
        if (updatedRows == 1) {
            return token;
        }
        throw passwordResetFailureAfterClaimRace(token.getId(), now);
    }

    private AuthPasswordResetTokenEntity resolveActivePasswordResetToken(String rawToken) {
        AuthPasswordResetTokenEntity token = authPasswordResetTokenRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new PasswordResetTokenException(PasswordResetFailureReason.INVALID));

        if (token.getUsedAt() != null || token.getSupersededAt() != null) {
            throw new PasswordResetTokenException(PasswordResetFailureReason.INVALID);
        }
        if (token.getExpiresAt().isBefore(now())) {
            throw new PasswordResetTokenException(PasswordResetFailureReason.EXPIRED);
        }
        return token;
    }

    private AuthService.PasswordResetTokenException passwordResetFailureAfterClaimRace(UUID tokenId, OffsetDateTime now) {
        return authPasswordResetTokenRepository.findById(tokenId)
                .map(token -> {
                    if (token.getExpiresAt().isBefore(now)) {
                        return new PasswordResetTokenException(PasswordResetFailureReason.EXPIRED);
                    }
                    return new PasswordResetTokenException(PasswordResetFailureReason.INVALID);
                })
                .orElseGet(() -> new PasswordResetTokenException(PasswordResetFailureReason.INVALID));
    }

    private void deleteSessionsForPrincipal(String principalName) {
        jdbcTemplate.update(
                """
                delete from spring_session_attributes
                where session_primary_id in (
                    select primary_id from spring_session where principal_name = ?
                )
                """,
                principalName
        );
        jdbcTemplate.update("delete from spring_session where principal_name = ?", principalName);
    }

    private void sendAfterCommit(Runnable task) {
        Runnable guardedTask = () -> {
            try {
                task.run();
            } catch (RuntimeException exception) {
                log.warn("Auth email dispatch failed", exception);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    Thread.ofVirtual().start(guardedTask);
                }
            });
            return;
        }

        Thread.ofVirtual().start(guardedTask);
    }

    private void enforcePublicResponseFloor(OffsetDateTime startedAt) {
        Duration elapsed = Duration.between(startedAt, now());
        Duration remaining = PUBLIC_AUTH_RESPONSE_FLOOR.minus(elapsed);
        sleep(remaining);
    }

    private static AuthenticatedUser toAuthenticatedUser(AuthUserEntity user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getEmailOriginal(),
                user.getEmailVerifiedAt() != null,
                user.getCreatedAt()
        );
    }

    public enum VerificationFailureReason {
        INVALID,
        EXPIRED
    }

    public enum PasswordResetFailureReason {
        INVALID,
        EXPIRED
    }

    public static final class InvalidCredentialsException extends RuntimeException {
    }

    public static final class InvalidPasswordException extends RuntimeException {

        public InvalidPasswordException(String message) {
            super(message);
        }
    }

    public static final class VerificationTokenException extends RuntimeException {

        private final VerificationFailureReason reason;

        public VerificationTokenException(VerificationFailureReason reason) {
            this.reason = reason;
        }

        public VerificationFailureReason getReason() {
            return reason;
        }
    }

    public static final class PasswordResetTokenException extends RuntimeException {

        private final PasswordResetFailureReason reason;

        public PasswordResetTokenException(PasswordResetFailureReason reason) {
            this.reason = reason;
        }

        public PasswordResetFailureReason getReason() {
            return reason;
        }
    }

    private static final class SecureRandomHolder {
        private static final java.security.SecureRandom INSTANCE = new java.security.SecureRandom();

        private SecureRandomHolder() {
        }
    }
}
