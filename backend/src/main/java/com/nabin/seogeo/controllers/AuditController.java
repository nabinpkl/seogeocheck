package com.nabin.seogeo.controllers;

import com.nabin.seogeo.audit.contract.consumer.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.service.AuditClaimService;
import com.nabin.seogeo.audit.service.AuditConsumerReportProjector;
import com.nabin.seogeo.audit.service.AuditOrchestrationService;
import com.nabin.seogeo.audit.service.AuditPersistenceService;
import com.nabin.seogeo.audit.service.OwnedAuditService;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.project.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@Validated
@RequestMapping("/audits")
public class AuditController {

    private final AuditOrchestrationService auditOrchestrationService;
    private final AuditPersistenceService auditPersistenceService;
    private final AuditClaimService auditClaimService;
    private final ProjectService projectService;
    private final OwnedAuditService ownedAuditService;
    private final AuditProperties auditProperties;
    private final AuditConsumerReportProjector auditConsumerReportProjector;

    public AuditController(
            AuditOrchestrationService auditOrchestrationService,
            AuditPersistenceService auditPersistenceService,
            AuditClaimService auditClaimService,
            ProjectService projectService,
            OwnedAuditService ownedAuditService,
            AuditProperties auditProperties,
            AuditConsumerReportProjector auditConsumerReportProjector
    ) {
        this.auditOrchestrationService = auditOrchestrationService;
        this.auditPersistenceService = auditPersistenceService;
        this.auditClaimService = auditClaimService;
        this.projectService = projectService;
        this.ownedAuditService = ownedAuditService;
        this.auditProperties = auditProperties;
        this.auditConsumerReportProjector = auditConsumerReportProjector;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAudit(
            @Valid @RequestBody StartAuditRequest request,
            Authentication authentication
    ) {
        UUID ownerUserId = authenticatedUserId(authentication);
        if (ownerUserId != null) {
            OwnedAuditService.OwnedAuditStartResult result = ownedAuditService.startOwnedAudit(ownerUserId, request.url(), request.projectSlug());
            Map<String, Object> responseBody = new java.util.LinkedHashMap<>();
            responseBody.put("jobId", result.jobId());
            responseBody.put("status", result.status().name());
            responseBody.put("streamUrl", buildAuditPath(result.jobId(), "stream"));
            responseBody.put("reportUrl", buildAuditPath(result.jobId(), "report"));
            responseBody.put("projectSlug", result.projectSlug());
            return ResponseEntity.accepted().body(responseBody);
        }

        String normalizedUrl = normalizeUrl(request.url());
        String jobId = "audit_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        OffsetDateTime createdAt = OffsetDateTime.now();
        auditOrchestrationService.startAudit(jobId, normalizedUrl, createdAt, null);

        String claimToken = auditClaimService.issueClaimTokenForUnownedRun(jobId);

        Map<String, Object> responseBody = new java.util.LinkedHashMap<>();
        responseBody.put("jobId", jobId);
        responseBody.put("status", AuditStatus.QUEUED.name());
        responseBody.put("streamUrl", buildAuditPath(jobId, "stream"));
        responseBody.put("reportUrl", buildAuditPath(jobId, "report"));
        responseBody.put("claimToken", claimToken);

        return ResponseEntity.accepted().body(responseBody);
    }

    @GetMapping(path = "/{jobId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAudit(
            @PathVariable String jobId,
            @RequestParam(value = "claim", required = false) String claimToken,
            Authentication authentication
    ) {
        AuditRunEntity run = findVisibleRun(jobId, authentication, claimToken)
                .orElseThrow(() -> new AuditNotFoundException(jobId));

        SseEmitter emitter = new SseEmitter(0L);
        AtomicBoolean active = new AtomicBoolean(true);
        emitter.onCompletion(() -> active.set(false));
        emitter.onTimeout(() -> active.set(false));
        emitter.onError(error -> active.set(false));

        long lastSeen = replayExistingEvents(jobId, emitter, active);
        if (!active.get() || run.getStatus().isTerminal()) {
            emitter.complete();
            return emitter;
        }

        long finalLastSeen = lastSeen;
        Thread.ofVirtual().start(() -> tailAuditStream(jobId, finalLastSeen, emitter, active));
        return emitter;
    }

    @GetMapping("/{jobId}/report")
    public ResponseEntity<Object> getReport(
            @PathVariable String jobId,
            @RequestParam(value = "claim", required = false) String claimToken,
            Authentication authentication
    ) {
        UUID requesterUserId = authenticatedUserId(authentication);
        if (requesterUserId != null) {
            OwnedAuditService.OwnedAuditReportResult result = ownedAuditService.getOwnedAuditReport(requesterUserId, jobId);
            if (result.report() != null) {
                return ResponseEntity.ok(result.report());
            }
            return responseForOwnedAuditReport(result);
        }

        AuditRunEntity run = findVisibleRun(jobId, authentication, claimToken)
                .orElseThrow(() -> new AuditNotFoundException(jobId));

        if (auditPersistenceService.findReport(jobId).isPresent()) {
            return ResponseEntity.ok(auditConsumerReportProjector.project(auditPersistenceService.readInternalReportPayload(jobId)));
        }

        if (run.getStatus() == AuditStatus.FAILED) {
            return ResponseEntity.ok(Map.of(
                    "jobId", jobId,
                    "status", AuditStatus.FAILED.name(),
                    "message", run.getFailureMessage() == null
                            ? "The audit could not be completed."
                            : run.getFailureMessage()
            ));
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "jobId", jobId,
                "status", run.getStatus().name(),
                "message", "Your final report is still being prepared."
        ));
    }

    @PostMapping("/{jobId}/claim-tokens")
    public ResponseEntity<Map<String, String>> createClaimToken(
            @PathVariable String jobId,
            Authentication authentication
    ) {
        String token = auditClaimService.issueClaimToken(jobId, authenticatedUserId(authentication));
        return ResponseEntity.ok(Map.of("token", token));
    }

    private long replayExistingEvents(String jobId, SseEmitter emitter, AtomicBoolean active) {
        List<AuditEventRecord> events = auditPersistenceService.findEvents(jobId);
        long lastSeen = 0;
        for (AuditEventRecord event : events) {
            sendEvent(emitter, event.payload(), active);
            lastSeen = event.sequence();
        }
        return lastSeen;
    }

    private java.util.Optional<AuditRunEntity> findVisibleRun(
            String jobId,
            Authentication authentication,
            String claimToken
    ) {
        UUID requesterUserId = authenticatedUserId(authentication);
        if (requesterUserId != null) {
            return auditPersistenceService.findVisibleRun(jobId, requesterUserId);
        }
        if (auditClaimService.canAccessAudit(jobId, claimToken)) {
            return auditPersistenceService.findRun(jobId);
        }
        return java.util.Optional.empty();
    }

    private void tailAuditStream(String jobId, long lastSeen, SseEmitter emitter, AtomicBoolean active) {
        long latestSeen = lastSeen;
        long lastHeartbeatAt = System.nanoTime();

        while (active.get()) {
            List<AuditEventRecord> newEvents = auditPersistenceService.findEventsAfter(jobId, latestSeen);
            if (!newEvents.isEmpty()) {
                for (AuditEventRecord event : newEvents) {
                    sendEvent(emitter, event.payload(), active);
                    latestSeen = event.sequence();
                    if (isTerminalEvent(event.payload())) {
                        active.set(false);
                        emitter.complete();
                        return;
                    }
                }
                lastHeartbeatAt = System.nanoTime();
            } else {
                if (heartbeatExpired(lastHeartbeatAt)) {
                    try {
                        emitter.send(SseEmitter.event().comment("heartbeat"));
                        lastHeartbeatAt = System.nanoTime();
                    } catch (IOException ioException) {
                        active.set(false);
                        emitter.completeWithError(ioException);
                        return;
                    }
                }

                AuditRunEntity run = auditPersistenceService.findRun(jobId)
                        .orElseThrow(() -> new AuditNotFoundException(jobId));
                if (run.getStatus().isTerminal()) {
                    active.set(false);
                    emitter.complete();
                    return;
                }
            }

            try {
                Thread.sleep(auditProperties.getSsePollInterval());
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                active.set(false);
                emitter.complete();
                return;
            }
        }
    }

    private boolean heartbeatExpired(long lastHeartbeatAt) {
        long elapsedNanos = System.nanoTime() - lastHeartbeatAt;
        return elapsedNanos >= auditProperties.getSseHeartbeatInterval().toNanos();
    }

    private boolean isTerminalEvent(AuditStreamEventSchema payload) {
        return payload.getType() == AuditStreamEventSchema.Type.COMPLETE
                || payload.getType() == AuditStreamEventSchema.Type.ERROR;
    }

    private void sendEvent(SseEmitter emitter, AuditStreamEventSchema event, AtomicBoolean active) {
        try {
            emitter.send(SseEmitter.event()
                    .id(event.getEventId())
                    .data(event));
        } catch (IOException ioException) {
            active.set(false);
            emitter.completeWithError(ioException);
        }
    }

    private String buildAuditPath(String jobId, String suffix) {
        return ServletUriComponentsBuilder.fromPath("/audits/{jobId}/" + suffix)
                .buildAndExpand(jobId)
                .toUriString();
    }

    private String normalizeUrl(String rawUrl) {
        String candidate = rawUrl.trim();
        if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
            candidate = "https://" + candidate;
        }
        URI.create(candidate);
        return candidate;
    }

    public record StartAuditRequest(@NotBlank String url, String projectSlug) {
    }

    private UUID authenticatedUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
            return null;
        }
        return authenticatedUser.getId();
    }

    private static final class AuditNotFoundException extends RuntimeException {
        private AuditNotFoundException(String jobId) {
            super("Audit not found: " + jobId);
        }
    }

    @ExceptionHandler(AuditNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(AuditNotFoundException notFoundException) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "AUDIT_NOT_FOUND",
                "message", notFoundException.getMessage()
        ));
    }

    @ExceptionHandler(AuditClaimService.AuditClaimNotAvailableException.class)
    public ResponseEntity<Map<String, Object>> handleClaimNotFound(
            AuditClaimService.AuditClaimNotAvailableException exception
    ) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "AUDIT_CLAIM_NOT_AVAILABLE",
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadUrl(IllegalArgumentException illegalArgumentException) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_AUDIT_URL",
                "message", "Enter a valid website URL to start the audit."
        ));
    }

    @ExceptionHandler(ProjectService.ProjectNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProjectNotFound(ProjectService.ProjectNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "PROJECT_NOT_FOUND",
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(OwnedAuditService.AuditNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOwnedAuditNotFound(OwnedAuditService.AuditNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "AUDIT_NOT_FOUND",
                "message", exception.getReason()
        ));
    }

    private ResponseEntity<Object> responseForOwnedAuditReport(OwnedAuditService.OwnedAuditReportResult result) {
        if (result.status() == AuditStatus.FAILED) {
            return ResponseEntity.ok(Map.of(
                    "jobId", result.jobId(),
                    "status", result.status().name(),
                    "message", result.message()
            ));
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "jobId", result.jobId(),
                "status", result.status().name(),
                "message", result.message()
        ));
    }
}
