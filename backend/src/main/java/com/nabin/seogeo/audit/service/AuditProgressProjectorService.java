package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.contract.internal.generated.AuditWorkerProgressEventSchema;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class AuditProgressProjectorService {

    private final AuditPersistenceService auditPersistenceService;

    public AuditProgressProjectorService(AuditPersistenceService auditPersistenceService) {
        this.auditPersistenceService = auditPersistenceService;
    }

    public AuditEventRecord project(
            AuditWorkerProgressEventSchema event,
            String sourceTopic,
            int sourcePartition,
            long sourceOffset
    ) {
        validate(event);

        AuditStreamEventSchema streamEvent = new AuditStreamEventSchema();
        streamEvent.setJobId(event.getJobId());
        streamEvent.setType(AuditStreamEventSchema.Type.fromValue(event.getEventType().value()));
        streamEvent.setStatus(AuditStreamEventSchema.Status.fromValue(event.getStatus().value()));
        streamEvent.setMessage(event.getMessage());
        streamEvent.setStage(event.getStage());
        streamEvent.setProgress(event.getProgress());
        streamEvent.setRuleId(event.getRuleId());
        if (event.getCheckStatus() != null) {
            streamEvent.setCheckStatus(AuditStreamEventSchema.CheckStatus.fromValue(event.getCheckStatus().value()));
        }
        if (event.getSeverity() != null) {
            streamEvent.setSeverity(AuditStreamEventSchema.Severity.fromValue(event.getSeverity().value()));
        }
        streamEvent.setInstruction(event.getInstruction());
        streamEvent.setDetail(event.getDetail());
        streamEvent.setSelector(event.getSelector());
        streamEvent.setMetric(event.getMetric());
        streamEvent.setProducer(event.getProducer());
        streamEvent.setSourceEventId(event.getEventId());

        return auditPersistenceService.appendProjectedEvent(
                streamEvent,
                OffsetDateTime.ofInstant(event.getEmittedAt().toInstant(), ZoneOffset.UTC),
                sourceTopic,
                sourcePartition,
                sourceOffset
        );
    }

    private void validate(AuditWorkerProgressEventSchema event) {
        if (event == null) {
            throw new IllegalArgumentException("Audit progress event is required.");
        }
        if (event.getSchemaVersion() == null || event.getSchemaVersion() != 1) {
            throw new IllegalArgumentException("Unsupported audit progress schema version.");
        }
        if (event.getEventId() == null || event.getEventId().isBlank()) {
            throw new IllegalArgumentException("Audit progress eventId is required.");
        }
        if (event.getJobId() == null || event.getJobId().isBlank()) {
            throw new IllegalArgumentException("Audit progress jobId is required.");
        }
        if (event.getProducer() == null || event.getProducer().isBlank()) {
            throw new IllegalArgumentException("Audit progress producer is required.");
        }
        if (event.getEventType() == null) {
            throw new IllegalArgumentException("Audit progress eventType is required.");
        }
        if (event.getStatus() == null) {
            throw new IllegalArgumentException("Audit progress status is required.");
        }
        if (event.getMessage() == null || event.getMessage().isBlank()) {
            throw new IllegalArgumentException("Audit progress message is required.");
        }
    }
}
