package com.nabin.seogeo.controllers;

import com.nabin.seogeo.audit.contract.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.service.AuditOrchestrationService;
import com.nabin.seogeo.audit.service.AuditPersistenceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class AuditController {

    private final AuditOrchestrationService auditOrchestrationService;
    private final AuditPersistenceService auditPersistenceService;
    private final AuditProperties auditProperties;

    public AuditController(
            AuditOrchestrationService auditOrchestrationService,
            AuditPersistenceService auditPersistenceService,
            AuditProperties auditProperties
    ) {
        this.auditOrchestrationService = auditOrchestrationService;
        this.auditPersistenceService = auditPersistenceService;
        this.auditProperties = auditProperties;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAudit(@Valid @RequestBody StartAuditRequest request) {
        String normalizedUrl = normalizeUrl(request.url());
        String jobId = "audit_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        OffsetDateTime createdAt = OffsetDateTime.now();

        auditOrchestrationService.startAudit(jobId, normalizedUrl, createdAt);

        return ResponseEntity.accepted().body(Map.of(
                "jobId", jobId,
                "status", AuditStatus.QUEUED.name(),
                "streamUrl", buildAuditUrl(jobId, "stream"),
                "reportUrl", buildAuditUrl(jobId, "report")
        ));
    }

    @GetMapping(path = "/{jobId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAudit(@PathVariable String jobId) {
        AuditRunEntity run = auditPersistenceService.findRun(jobId)
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
    public ResponseEntity<Object> getReport(@PathVariable String jobId) {
        AuditRunEntity run = auditPersistenceService.findRun(jobId)
                .orElseThrow(() -> new AuditNotFoundException(jobId));

        if (auditPersistenceService.findReport(jobId).isPresent()) {
            return ResponseEntity.ok(auditPersistenceService.readReportPayload(jobId));
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

    private long replayExistingEvents(String jobId, SseEmitter emitter, AtomicBoolean active) {
        List<AuditEventRecord> events = auditPersistenceService.findEvents(jobId);
        long lastSeen = 0;
        for (AuditEventRecord event : events) {
            sendEvent(emitter, event.payload(), active);
            lastSeen = event.sequence();
        }
        return lastSeen;
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

    private String buildAuditUrl(String jobId, String suffix) {
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/audits/{jobId}/" + suffix)
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

    public record StartAuditRequest(@NotBlank String url) {
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

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadUrl(IllegalArgumentException illegalArgumentException) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_AUDIT_URL",
                "message", "Enter a valid website URL to start the audit."
        ));
    }
}
