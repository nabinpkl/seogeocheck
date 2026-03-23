package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditProgressEvent;
import com.nabin.seogeo.audit.domain.AuditStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuditProgressProjectorService {

    private final AuditPersistenceService auditPersistenceService;

    public AuditProgressProjectorService(AuditPersistenceService auditPersistenceService) {
        this.auditPersistenceService = auditPersistenceService;
    }

    public AuditEventRecord project(
            AuditProgressEvent event,
            String sourceTopic,
            int sourcePartition,
            long sourceOffset
    ) {
        validate(event);

        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("message", event.message());
        if (event.stage() != null && !event.stage().isBlank()) {
            attributes.put("stage", event.stage());
        }
        if (event.progress() != null) {
            attributes.put("progress", event.progress());
        }
        if (event.ruleId() != null && !event.ruleId().isBlank()) {
            attributes.put("ruleId", event.ruleId());
        }
        if (event.checkStatus() != null && !event.checkStatus().isBlank()) {
            attributes.put("checkStatus", event.checkStatus());
        }
        if (event.severity() != null && !event.severity().isBlank()) {
            attributes.put("severity", event.severity());
        }
        if (event.instruction() != null && !event.instruction().isBlank()) {
            attributes.put("instruction", event.instruction());
        }
        if (event.detail() != null && !event.detail().isBlank()) {
            attributes.put("detail", event.detail());
        }
        if (event.selector() != null && !event.selector().isBlank()) {
            attributes.put("selector", event.selector());
        }
        if (event.metric() != null && !event.metric().isBlank()) {
            attributes.put("metric", event.metric());
        }
        attributes.put("producer", event.producer());
        attributes.put("sourceEventId", event.eventId());

        return auditPersistenceService.appendProjectedEvent(
                event.jobId(),
                event.eventId(),
                event.eventType(),
                AuditStatus.valueOf(event.status()),
                attributes,
                event.emittedAt(),
                sourceTopic,
                sourcePartition,
                sourceOffset
        );
    }

    private void validate(AuditProgressEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Audit progress event is required.");
        }
        if (event.schemaVersion() == null || event.schemaVersion() != 1) {
            throw new IllegalArgumentException("Unsupported audit progress schema version.");
        }
        if (event.eventId() == null || event.eventId().isBlank()) {
            throw new IllegalArgumentException("Audit progress eventId is required.");
        }
        if (event.jobId() == null || event.jobId().isBlank()) {
            throw new IllegalArgumentException("Audit progress jobId is required.");
        }
        if (event.producer() == null || event.producer().isBlank()) {
            throw new IllegalArgumentException("Audit progress producer is required.");
        }
        if (event.eventType() == null || event.eventType().isBlank()) {
            throw new IllegalArgumentException("Audit progress eventType is required.");
        }
        if (event.status() == null || event.status().isBlank()) {
            throw new IllegalArgumentException("Audit progress status is required.");
        }
        if (event.message() == null || event.message().isBlank()) {
            throw new IllegalArgumentException("Audit progress message is required.");
        }
    }
}
