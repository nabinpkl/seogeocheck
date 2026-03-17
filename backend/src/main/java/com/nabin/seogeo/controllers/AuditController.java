package com.nabin.seogeo.controllers;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@Validated
@RequestMapping("/audits")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class AuditController {

    private final ConcurrentMap<String, FakeAuditSession> sessions = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAudit(@Valid @RequestBody StartAuditRequest request) {
        String normalizedUrl = normalizeUrl(request.url());
        String jobId = "audit_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        FakeAuditSession session = new FakeAuditSession(jobId, normalizedUrl, OffsetDateTime.now().toString());
        sessions.put(jobId, session);
        startFakeAudit(session);

        return ResponseEntity.accepted().body(Map.of(
                "jobId", jobId,
                "status", session.status().get().name(),
                "streamUrl", buildAuditUrl(jobId, "stream"),
                "reportUrl", buildAuditUrl(jobId, "report")
        ));
    }

    @GetMapping(path = "/{jobId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAudit(@PathVariable String jobId) {
        FakeAuditSession session = sessions.get(jobId);
        if (session == null) {
            throw new AuditNotFoundException(jobId);
        }

        SseEmitter emitter = new SseEmitter(0L);
        emitter.onCompletion(() -> session.emitters().remove(emitter));
        emitter.onTimeout(() -> session.emitters().remove(emitter));
        emitter.onError((error) -> session.emitters().remove(emitter));

        session.emitters().add(emitter);

        for (Map<String, Object> event : session.events()) {
            sendEvent(emitter, event);
        }

        return emitter;
    }

    @GetMapping("/{jobId}/report")
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable String jobId) {
        FakeAuditSession session = sessions.get(jobId);
        if (session == null) {
            throw new AuditNotFoundException(jobId);
        }

        if (!session.reportReady()) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                    "jobId", jobId,
                    "status", session.status().get().name(),
                    "message", "Verified report is still being assembled."
            ));
        }

        return ResponseEntity.ok(session.report());
    }

    private void startFakeAudit(FakeAuditSession session) {
        Thread.ofVirtual().start(() -> {
            try {
                publish(session, "status", Map.of(
                        "status", AuditStatus.QUEUED.name(),
                        "message", "Audit accepted. Allocating the first pass."
                ));

                Thread.sleep(550);
                session.status().set(AuditStatus.STREAMING);
                publish(session, "status", Map.of(
                        "status", AuditStatus.STREAMING.name(),
                        "progress", 8,
                        "message", "Streaming live triage from the sovereign oracle."
                ));

                Thread.sleep(700);
                publish(session, "finding", Map.of(
                        "status", AuditStatus.STREAMING.name(),
                        "severity", "high",
                        "message", "The page title is missing and weakens first-pass relevance.",
                        "selector", "head > title",
                        "instruction", "Add a unique title tag that includes the business and primary intent.",
                        "progress", 26
                ));

                Thread.sleep(750);
                publish(session, "finding", Map.of(
                        "status", AuditStatus.STREAMING.name(),
                        "severity", "medium",
                        "message", "Entity signals are thin on the homepage hero section.",
                        "selector", "main h1",
                        "instruction", "Clarify the business entity and service scope in the H1 and supporting copy.",
                        "progress", 51
                ));

                Thread.sleep(750);
                publish(session, "finding", Map.of(
                        "status", AuditStatus.STREAMING.name(),
                        "severity", "medium",
                        "message", "The page lacks a visible trust proof near the primary call-to-action.",
                        "selector", "main section:nth-of-type(1)",
                        "instruction", "Add concise trust indicators near the audit trigger to improve AI confidence.",
                        "progress", 77
                ));

                Thread.sleep(600);
                session.status().set(AuditStatus.COMPLETE);
                publish(session, "complete", Map.of(
                        "status", AuditStatus.COMPLETE.name(),
                        "progress", 100,
                        "message", "Live triage complete. Sealing the signed evidence."
                ));

                Thread.sleep(850);
                session.report(buildReport(session));
                session.reportReady(true);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                session.status().set(AuditStatus.FAILED);
                publish(session, "error", Map.of(
                        "status", AuditStatus.FAILED.name(),
                        "message", "The fake audit worker was interrupted."
                ));
            }
        });
    }

    private Map<String, Object> buildReport(FakeAuditSession session) {
        List<Map<String, Object>> reportFindings = List.of(
                Map.of(
                        "id", "title-tag",
                        "severity", "high",
                        "label", "Missing title tag",
                        "selector", "head > title",
                        "instruction", "Add a unique title tag that clearly states the entity and commercial intent."
                ),
                Map.of(
                        "id", "entity-clarity",
                        "severity", "medium",
                        "label", "Weak entity framing",
                        "selector", "main h1",
                        "instruction", "Tighten the headline so search engines and answer engines can map the entity quickly."
                ),
                Map.of(
                        "id", "trust-signal",
                        "severity", "medium",
                        "label", "Missing trust proof near CTA",
                        "selector", "main section:nth-of-type(1)",
                        "instruction", "Surface a short trust statement or proof cluster near the primary action."
                )
        );

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("score", 82);
        summary.put("status", AuditStatus.VERIFIED.name());
        summary.put("targetUrl", session.targetUrl());
        summary.put("topIssue", "Missing title tag");

        Map<String, Object> signature = new LinkedHashMap<>();
        signature.put("present", true);
        signature.put("algorithm", "HMAC-SHA256");
        signature.put("value", "fake_dev_signature_" + session.jobId());

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("jobId", session.jobId());
        report.put("status", AuditStatus.VERIFIED.name());
        report.put("generatedAt", OffsetDateTime.now().toString());
        report.put("targetUrl", session.targetUrl());
        report.put("summary", summary);
        report.put("findings", reportFindings);
        report.put("signature", signature);
        report.put("reportType", "FAKE_SIGNED_AUDIT");
        return report;
    }

    private void publish(FakeAuditSession session, String type, Map<String, Object> payload) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("jobId", session.jobId());
        event.put("eventId", String.valueOf(session.sequence().incrementAndGet()));
        event.put("timestamp", OffsetDateTime.now().toString());
        event.put("type", type);
        event.putAll(payload);

        session.events().add(event);
        for (SseEmitter emitter : session.emitters()) {
            sendEvent(emitter, event);
        }
    }

    private void sendEvent(SseEmitter emitter, Map<String, Object> event) {
        try {
            emitter.send(SseEmitter.event()
                    .id(String.valueOf(event.get("eventId")))
                    .data(event));
        } catch (IOException ioException) {
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

    private static final class FakeAuditSession {
        private final String jobId;
        private final String targetUrl;
        private final String createdAt;
        private final AtomicReference<AuditStatus> status = new AtomicReference<>(AuditStatus.QUEUED);
        private final AtomicInteger sequence = new AtomicInteger(0);
        private final List<Map<String, Object>> events = new CopyOnWriteArrayList<>();
        private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
        private volatile boolean reportReady;
        private volatile Map<String, Object> report = Map.of();

        private FakeAuditSession(String jobId, String targetUrl, String createdAt) {
            this.jobId = jobId;
            this.targetUrl = targetUrl;
            this.createdAt = createdAt;
        }

        private String jobId() {
            return jobId;
        }

        private String targetUrl() {
            return targetUrl;
        }

        @SuppressWarnings("unused")
        private String createdAt() {
            return createdAt;
        }

        private AtomicReference<AuditStatus> status() {
            return status;
        }

        private AtomicInteger sequence() {
            return sequence;
        }

        private List<Map<String, Object>> events() {
            return events;
        }

        private List<SseEmitter> emitters() {
            return emitters;
        }

        private boolean reportReady() {
            return reportReady;
        }

        private void reportReady(boolean reportReady) {
            this.reportReady = reportReady;
        }

        private Map<String, Object> report() {
            return report;
        }

        private void report(Map<String, Object> report) {
            this.report = report;
        }
    }

    private enum AuditStatus {
        QUEUED,
        STREAMING,
        COMPLETE,
        FAILED,
        VERIFIED
    }

    private static final class AuditNotFoundException extends RuntimeException {
        private AuditNotFoundException(String jobId) {
            super("Audit not found: " + jobId);
        }
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(AuditNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(AuditNotFoundException notFoundException) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "AUDIT_NOT_FOUND",
                "message", notFoundException.getMessage()
        ));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadUrl(IllegalArgumentException illegalArgumentException) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_AUDIT_URL",
                "message", illegalArgumentException.getMessage()
        ));
    }
}
