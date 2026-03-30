package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.persistence.AuditClaimTokenEntity;
import com.nabin.seogeo.audit.persistence.AuditClaimTokenRepository;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.auth.config.AuthProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class AuditClaimService {

    private final AuditPersistenceService auditPersistenceService;
    private final AuditClaimTokenRepository auditClaimTokenRepository;
    private final AuthProperties authProperties;
    private final Clock clock;

    public AuditClaimService(
            AuditPersistenceService auditPersistenceService,
            AuditClaimTokenRepository auditClaimTokenRepository,
            AuthProperties authProperties,
            Clock clock
    ) {
        this.auditPersistenceService = auditPersistenceService;
        this.auditClaimTokenRepository = auditClaimTokenRepository;
        this.authProperties = authProperties;
        this.clock = clock;
    }

    @Transactional
    public String issueClaimToken(String jobId, UUID requesterUserId) {
        AuditRunEntity run = auditPersistenceService.findVisibleRun(jobId, requesterUserId)
                .orElseThrow(() -> new AuditClaimNotAvailableException(jobId));

        if (run.getOwnerUserId() != null) {
            throw new AuditClaimNotAvailableException(jobId);
        }

        OffsetDateTime now = now();
        String rawToken = generateRawToken();

        AuditClaimTokenEntity token = new AuditClaimTokenEntity();
        token.setId(UUID.randomUUID());
        token.setJobId(jobId);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(now.plus(authProperties.getAuditClaimTokenTtl()));
        token.setCreatedAt(now);
        auditClaimTokenRepository.save(token);

        return rawToken;
    }

    @Transactional
    public String issueClaimTokenForUnownedRun(String jobId) {
        AuditRunEntity run = auditPersistenceService.findRun(jobId)
                .orElseThrow(() -> new AuditClaimNotAvailableException(jobId));

        if (run.getOwnerUserId() != null) {
            throw new AuditClaimNotAvailableException(jobId);
        }

        OffsetDateTime now = now();
        String rawToken = generateRawToken();

        AuditClaimTokenEntity token = new AuditClaimTokenEntity();
        token.setId(UUID.randomUUID());
        token.setJobId(jobId);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(now.plus(authProperties.getAuditClaimTokenTtl()));
        token.setCreatedAt(now);
        auditClaimTokenRepository.save(token);

        return rawToken;
    }

    @Transactional(readOnly = true)
    public boolean canAccessAudit(String jobId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }

        return auditClaimTokenRepository.findByTokenHash(hashToken(rawToken))
                .filter(this::isActive)
                .map(AuditClaimTokenEntity::getJobId)
                .filter(jobId::equals)
                .isPresent();
    }

    @Transactional
    public boolean tryReserveClaim(String rawToken, UUID userId) {
        AuditClaimTokenEntity token = resolveActiveToken(rawToken);
        if (token == null) {
            return false;
        }

        if (token.getReservedUserId() != null && !Objects.equals(token.getReservedUserId(), userId)) {
            return false;
        }

        token.setReservedUserId(userId);
        auditClaimTokenRepository.save(token);
        return true;
    }

    @Transactional
    public boolean tryClaimAudit(String rawToken, UUID userId) {
        AuditClaimTokenEntity token = resolveActiveToken(rawToken);
        if (token == null) {
            return false;
        }

        return tryClaimAudit(token.getId(), userId);
    }

    @Transactional
    public void consumeReservedClaimsForUser(UUID userId) {
        List<AuditClaimTokenEntity> activeTokens = auditClaimTokenRepository.findActiveReservedTokens(userId, now());
        for (AuditClaimTokenEntity token : activeTokens) {
            tryClaimAudit(token.getId(), userId);
        }
    }

    private boolean tryClaimAudit(UUID tokenId, UUID userId) {
        AuditClaimTokenEntity lockedToken = auditClaimTokenRepository.findByIdForUpdate(tokenId)
                .orElse(null);
        if (lockedToken == null || !isActive(lockedToken)) {
            return false;
        }

        if (lockedToken.getReservedUserId() != null && !Objects.equals(lockedToken.getReservedUserId(), userId)) {
            return false;
        }

        try {
            auditPersistenceService.claimRun(lockedToken.getJobId(), userId);
        } catch (IllegalArgumentException | AuditPersistenceService.AuditAlreadyClaimedException exception) {
            return false;
        }

        lockedToken.setReservedUserId(userId);
        lockedToken.setConsumedAt(now());
        auditClaimTokenRepository.save(lockedToken);
        return true;
    }

    private AuditClaimTokenEntity resolveActiveToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return null;
        }

        return auditClaimTokenRepository.findByTokenHash(hashToken(rawToken))
                .flatMap(token -> auditClaimTokenRepository.findByIdForUpdate(token.getId()))
                .filter(this::isActive)
                .orElse(null);
    }

    private boolean isActive(AuditClaimTokenEntity token) {
        return token.getConsumedAt() == null && token.getExpiresAt().isAfter(now());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
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

    public static final class AuditClaimNotAvailableException extends RuntimeException {
        public AuditClaimNotAvailableException(String jobId) {
            super("Audit claim not available: " + jobId);
        }
    }

    private static final class SecureRandomHolder {
        private static final java.security.SecureRandom INSTANCE = new java.security.SecureRandom();

        private SecureRandomHolder() {
        }
    }
}
