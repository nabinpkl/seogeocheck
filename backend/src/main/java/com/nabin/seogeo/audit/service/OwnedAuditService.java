package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.project.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OwnedAuditService {

    private static final String REPORT_PENDING_MESSAGE = "Your final report is still being prepared.";

    private final AuditOrchestrationService auditOrchestrationService;
    private final AuditPersistenceService auditPersistenceService;
    private final ProjectService projectService;

    public OwnedAuditService(
            AuditOrchestrationService auditOrchestrationService,
            AuditPersistenceService auditPersistenceService,
            ProjectService projectService
    ) {
        this.auditOrchestrationService = auditOrchestrationService;
        this.auditPersistenceService = auditPersistenceService;
        this.projectService = projectService;
    }

    public OwnedAuditStartResult startOwnedAudit(UUID ownerUserId, String rawUrl, String requestedProjectSlug) {
        String normalizedUrl = normalizeUrl(rawUrl);
        String jobId = "audit_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        OffsetDateTime createdAt = OffsetDateTime.now();
        String resolvedProjectSlug = projectService.resolveRequestedOrDefaultProjectSlug(ownerUserId, requestedProjectSlug);

        auditOrchestrationService.startAudit(jobId, normalizedUrl, createdAt, ownerUserId);
        projectService.attachAuditToProject(ownerUserId, resolvedProjectSlug, jobId);

        return new OwnedAuditStartResult(jobId, AuditStatus.QUEUED, resolvedProjectSlug);
    }

    public OwnedAuditReportResult getOwnedAuditReport(UUID ownerUserId, String jobId) {
        AuditRunEntity run = requireVisibleRun(ownerUserId, jobId);

        if (auditPersistenceService.findReport(jobId).isPresent()) {
            return OwnedAuditReportResult.finalReport(jobId, auditPersistenceService.readReportPayload(jobId));
        }

        if (run.getStatus() == AuditStatus.FAILED) {
            return OwnedAuditReportResult.failed(
                    jobId,
                    run.getFailureMessage() == null ? "The audit could not be completed." : run.getFailureMessage()
            );
        }

        return OwnedAuditReportResult.pending(jobId, run.getStatus(), REPORT_PENDING_MESSAGE);
    }

    public AuditRunEntity requireVisibleRun(UUID ownerUserId, String jobId) {
        return auditPersistenceService.findVisibleRun(jobId, ownerUserId)
                .orElseThrow(() -> new AuditNotFoundException(jobId));
    }

    private String normalizeUrl(String rawUrl) {
        String candidate = rawUrl == null ? "" : rawUrl.trim();
        if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
            candidate = "https://" + candidate;
        }
        URI.create(candidate);
        return candidate;
    }

    public record OwnedAuditStartResult(
            String jobId,
            AuditStatus status,
            String projectSlug
    ) {
    }

    public record OwnedAuditReportResult(
            String jobId,
            AuditStatus status,
            AuditReportSchema report,
            String message
    ) {
        static OwnedAuditReportResult finalReport(String jobId, AuditReportSchema report) {
            return new OwnedAuditReportResult(jobId, AuditStatus.VERIFIED, report, null);
        }

        static OwnedAuditReportResult failed(String jobId, String message) {
            return new OwnedAuditReportResult(jobId, AuditStatus.FAILED, null, message);
        }

        static OwnedAuditReportResult pending(String jobId, AuditStatus status, String message) {
            return new OwnedAuditReportResult(jobId, status, null, message);
        }
    }

    public static final class AuditNotFoundException extends ResponseStatusException {
        public AuditNotFoundException(String jobId) {
            super(HttpStatus.NOT_FOUND, "Audit not found: " + jobId);
        }
    }
}
