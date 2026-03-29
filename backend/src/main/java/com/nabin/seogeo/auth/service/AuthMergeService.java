package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserMergeIntentEntity;
import com.nabin.seogeo.auth.persistence.AuthUserMergeIntentRepository;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import com.nabin.seogeo.project.persistence.ProjectEntity;
import com.nabin.seogeo.project.persistence.ProjectRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class AuthMergeService {

    private static final Duration MERGE_INTENT_TTL = Duration.ofHours(6);

    private final AuthUserMergeIntentRepository authUserMergeIntentRepository;
    private final AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository;
    private final AuthPasswordResetTokenRepository authPasswordResetTokenRepository;
    private final AuthUserRepository authUserRepository;
    private final ProjectRepository projectRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AuthSessionService authSessionService;
    private final TransactionTemplate transactionTemplate;

    public AuthMergeService(
            AuthUserMergeIntentRepository authUserMergeIntentRepository,
            AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository,
            AuthPasswordResetTokenRepository authPasswordResetTokenRepository,
            AuthUserRepository authUserRepository,
            ProjectRepository projectRepository,
            JdbcTemplate jdbcTemplate,
            AuthSessionService authSessionService,
            PlatformTransactionManager transactionManager
    ) {
        this.authUserMergeIntentRepository = authUserMergeIntentRepository;
        this.authEmailVerificationTokenRepository = authEmailVerificationTokenRepository;
        this.authPasswordResetTokenRepository = authPasswordResetTokenRepository;
        this.authUserRepository = authUserRepository;
        this.projectRepository = projectRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.authSessionService = authSessionService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void createMergeIntent(
            UUID sourceUserId,
            UUID targetUserId,
            HttpServletRequest request,
            OffsetDateTime now
    ) {
        if (request == null) {
            return;
        }
        authSessionService.clearMergeIntent(request);
        UUID intentId = transactionTemplate.execute(status -> {
            authUserMergeIntentRepository.deleteExpiredOrConsumed(now);
            AuthUserMergeIntentEntity intent = new AuthUserMergeIntentEntity();
            intent.setId(UUID.randomUUID());
            intent.setSourceUserId(sourceUserId);
            intent.setTargetUserId(targetUserId);
            intent.setCreatedAt(now);
            intent.setExpiresAt(now.plus(MERGE_INTENT_TTL));
            authUserMergeIntentRepository.save(intent);
            return intent.getId();
        });
        authSessionService.rememberMergeIntent(request, intentId);
    }

    public AuthUserMergeIntentEntity resolveActiveMergeIntent(HttpServletRequest request, OffsetDateTime now) {
        UUID mergeIntentId = authSessionService.resolveMergeIntentId(request);
        if (mergeIntentId == null) {
            return null;
        }

        AuthUserMergeIntentEntity intent = authUserMergeIntentRepository.findById(mergeIntentId).orElse(null);
        if (intent == null || intent.getConsumedAt() != null || intent.getExpiresAt().isBefore(now)) {
            authSessionService.clearMergeIntent(request);
            return null;
        }
        return intent;
    }

    public void mergeAnonymousWorkspaceIfReady(
            AuthUserEntity targetUser,
            HttpServletRequest request,
            AuthUserMergeIntentEntity mergeIntent,
            OffsetDateTime now
    ) {
        if (mergeIntent == null) {
            mergeIntent = resolveActiveMergeIntent(request, now);
        }
        if (mergeIntent == null) {
            return;
        }
        if (!Objects.equals(mergeIntent.getTargetUserId(), targetUser.getId())) {
            authSessionService.clearMergeIntent(request);
            return;
        }

        AuthUserMergeIntentEntity lockedIntent = authUserMergeIntentRepository.findByIdForUpdate(mergeIntent.getId())
                .orElse(null);
        if (lockedIntent == null
                || lockedIntent.getConsumedAt() != null
                || lockedIntent.getExpiresAt().isBefore(now)
                || !Objects.equals(lockedIntent.getTargetUserId(), targetUser.getId())) {
            authSessionService.clearMergeIntent(request);
            return;
        }

        if (Objects.equals(lockedIntent.getSourceUserId(), targetUser.getId())) {
            lockedIntent.setConsumedAt(now);
            authUserMergeIntentRepository.save(lockedIntent);
            authSessionService.clearMergeIntent(request);
            return;
        }

        AuthUserEntity sourceUser = authUserRepository.findByIdForUpdate(lockedIntent.getSourceUserId()).orElse(null);
        if (sourceUser == null) {
            lockedIntent.setConsumedAt(now);
            authUserMergeIntentRepository.save(lockedIntent);
            authSessionService.clearMergeIntent(request);
            return;
        }

        moveAnonymousWorkspace(sourceUser, targetUser, now);
        lockedIntent.setConsumedAt(now);
        authUserMergeIntentRepository.save(lockedIntent);
        authEmailVerificationTokenRepository.deleteByUserId(sourceUser.getId());
        authPasswordResetTokenRepository.deleteByUserId(sourceUser.getId());
        authUserMergeIntentRepository.deleteByUserId(sourceUser.getId());
        authUserRepository.delete(sourceUser);
        authSessionService.clearMergeIntent(request);
    }

    private void moveAnonymousWorkspace(AuthUserEntity sourceUser, AuthUserEntity targetUser, OffsetDateTime now) {
        moveProjects(sourceUser.getId(), targetUser.getId(), now);
        jdbcTemplate.update(
                "update audit_runs set owner_user_id = ?, claimed_at = coalesce(claimed_at, ?) where owner_user_id = ?",
                targetUser.getId(),
                now,
                sourceUser.getId()
        );
        jdbcTemplate.update(
                "update audit_project_links set linked_by_user_id = ? where linked_by_user_id = ?",
                targetUser.getId(),
                sourceUser.getId()
        );
        jdbcTemplate.update(
                "update audit_claim_tokens set reserved_user_id = ? where reserved_user_id = ?",
                targetUser.getId(),
                sourceUser.getId()
        );
    }

    private void moveProjects(UUID sourceUserId, UUID targetUserId, OffsetDateTime now) {
        List<ProjectEntity> sourceProjects = projectRepository.findByOwnerUserIdOrderByCreatedAtAsc(sourceUserId);
        for (ProjectEntity project : sourceProjects) {
            project.setOwnerUserId(targetUserId);
            project.setSlug(generateUniqueProjectSlug(targetUserId, project.getSlug()));
            project.setUpdatedAt(now);
        }
        projectRepository.saveAll(sourceProjects);
    }

    private String generateUniqueProjectSlug(UUID ownerUserId, String requestedSlug) {
        String baseSlug = requestedSlug == null || requestedSlug.isBlank() ? "project" : requestedSlug;
        String candidate = baseSlug;
        int suffix = 2;
        while (projectRepository.existsByOwnerUserIdAndSlug(ownerUserId, candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
        return candidate;
    }
}
