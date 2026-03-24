package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditEventEntity;
import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import com.nabin.seogeo.audit.persistence.AuditReportEntity;
import com.nabin.seogeo.audit.persistence.AuditReportRepository;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class AuditPersistenceService {

    private final AuditRunRepository auditRunRepository;
    private final AuditEventRepository auditEventRepository;
    private final AuditReportRepository auditReportRepository;
    private final ObjectMapper objectMapper;
    private final AuditContractSchemaValidator auditContractSchemaValidator;

    public AuditPersistenceService(
            AuditRunRepository auditRunRepository,
            AuditEventRepository auditEventRepository,
            AuditReportRepository auditReportRepository,
            ObjectMapper objectMapper,
            AuditContractSchemaValidator auditContractSchemaValidator
    ) {
        this.auditRunRepository = auditRunRepository;
        this.auditEventRepository = auditEventRepository;
        this.auditReportRepository = auditReportRepository;
        this.objectMapper = objectMapper;
        this.auditContractSchemaValidator = auditContractSchemaValidator;
    }

    @Transactional
    public void createPendingRun(String jobId, String targetUrl, OffsetDateTime createdAt) {
        if (auditRunRepository.existsById(jobId)) {
            return;
        }

        AuditRunEntity entity = new AuditRunEntity();
        entity.setJobId(jobId);
        entity.setTargetUrl(targetUrl);
        entity.setStatus(AuditStatus.QUEUED);
        entity.setCreatedAt(createdAt);
        auditRunRepository.save(entity);
    }

    @Transactional
    public void deletePendingRun(String jobId) {
        auditRunRepository.deleteById(jobId);
    }

    @Transactional
    public void ensureQueuedRun(String jobId, String targetUrl, OffsetDateTime requestedAt) {
        AuditRunEntity run = auditRunRepository.findById(jobId)
                .orElseGet(() -> {
                    AuditRunEntity created = new AuditRunEntity();
                    created.setJobId(jobId);
                    created.setTargetUrl(targetUrl);
                    created.setCreatedAt(requestedAt);
                    return created;
                });

        run.setTargetUrl(targetUrl);
        if (run.getCreatedAt() == null) {
            run.setCreatedAt(requestedAt);
        }
        run.setStatus(AuditStatus.QUEUED);
        if (run.getStartedAt() == null) {
            run.setStartedAt(OffsetDateTime.now());
        }
        auditRunRepository.save(run);
    }

    @Transactional
    public AuditEventRecord appendEvent(AuditStreamEventSchema event) {
        AuditRunEntity run = getRunOrThrow(event.getJobId());
        long nextSequence = auditEventRepository.findMaxSequenceByJobId(event.getJobId()) + 1;
        OffsetDateTime timestamp = OffsetDateTime.now();
        AuditStreamEventSchema payload = materializeStreamEvent(event, nextSequence, timestamp);
        auditContractSchemaValidator.validateStreamEventPayload(payload);

        AuditEventEntity entity = new AuditEventEntity();
        entity.setJobId(payload.getJobId());
        entity.setSequence(nextSequence);
        entity.setEventType(payload.getType().value());
        entity.setStatus(AuditStatus.valueOf(payload.getStatus().value()));
        entity.setPayloadJson(writeJson(payload));
        entity.setCreatedAt(timestamp);
        auditEventRepository.save(entity);

        if (payload.getType() == AuditStreamEventSchema.Type.STATUS
                && payload.getStatus() == AuditStreamEventSchema.Status.STREAMING) {
            run.setStatus(AuditStatus.STREAMING);
            auditRunRepository.save(run);
        }

        return new AuditEventRecord(
                payload.getJobId(),
                nextSequence,
                payload.getType().value(),
                AuditStatus.valueOf(payload.getStatus().value()),
                payload
        );
    }

    @Transactional
    public AuditEventRecord appendProjectedEvent(
            AuditStreamEventSchema event,
            OffsetDateTime emittedAt,
            String sourceTopic,
            Integer sourcePartition,
            Long sourceOffset
    ) {
        Optional<AuditEventEntity> existing = auditEventRepository.findBySourceEventId(event.getSourceEventId());
        if (existing.isPresent()) {
            return toRecord(existing.orElseThrow());
        }

        AuditRunEntity run = getRunOrThrow(event.getJobId());
        long nextSequence = auditEventRepository.findMaxSequenceByJobId(event.getJobId()) + 1;
        OffsetDateTime timestamp = emittedAt == null ? OffsetDateTime.now() : emittedAt;
        AuditStreamEventSchema payload = materializeStreamEvent(event, nextSequence, timestamp);
        auditContractSchemaValidator.validateStreamEventPayload(payload);

        AuditEventEntity entity = new AuditEventEntity();
        entity.setJobId(payload.getJobId());
        entity.setSequence(nextSequence);
        entity.setEventType(payload.getType().value());
        entity.setStatus(AuditStatus.valueOf(payload.getStatus().value()));
        entity.setPayloadJson(writeJson(payload));
        entity.setCreatedAt(timestamp);
        entity.setSourceEventId(payload.getSourceEventId());
        entity.setSourceTopic(sourceTopic);
        entity.setSourcePartition(sourcePartition);
        entity.setSourceOffset(sourceOffset);

        try {
            auditEventRepository.save(entity);
        } catch (DataIntegrityViolationException exception) {
            return auditEventRepository.findBySourceEventId(event.getSourceEventId())
                    .map(this::toRecord)
                    .orElseThrow(() -> exception);
        }

        if (payload.getType() == AuditStreamEventSchema.Type.STATUS
                && payload.getStatus() == AuditStreamEventSchema.Status.STREAMING) {
            run.setStatus(AuditStatus.STREAMING);
            auditRunRepository.save(run);
        }

        return new AuditEventRecord(
                payload.getJobId(),
                nextSequence,
                payload.getType().value(),
                AuditStatus.valueOf(payload.getStatus().value()),
                payload
        );
    }

    @Transactional(readOnly = true)
    public Optional<AuditRunEntity> findRun(String jobId) {
        return auditRunRepository.findById(jobId);
    }

    @Transactional(readOnly = true)
    public List<AuditEventRecord> findEvents(String jobId) {
        return auditEventRepository.findByJobIdOrderBySequenceAsc(jobId).stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditEventRecord> findEventsAfter(String jobId, long sequence) {
        return auditEventRepository.findByJobIdAndSequenceGreaterThanOrderBySequenceAsc(jobId, sequence).stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AuditReportRecord> findReport(String jobId) {
        return auditReportRepository.findById(jobId)
                .map(entity -> new AuditReportRecord(
                        entity.getJobId(),
                        entity.getGeneratedAt(),
                        entity.getReportJson(),
                        entity.getSignatureAlgorithm(),
                        entity.getSignatureValue()
                ));
    }

    @Transactional
    public void persistReport(AuditReportRecord reportRecord) {
        AuditReportEntity entity = new AuditReportEntity();
        entity.setJobId(reportRecord.jobId());
        entity.setGeneratedAt(reportRecord.generatedAt());
        entity.setReportJson(reportRecord.reportJson());
        entity.setSignatureAlgorithm(reportRecord.signatureAlgorithm());
        entity.setSignatureValue(reportRecord.signatureValue());
        auditReportRepository.save(entity);
    }

    @Transactional
    public void markFailed(String jobId, String message) {
        AuditRunEntity run = getRunOrThrow(jobId);
        run.setStatus(AuditStatus.FAILED);
        run.setFailureMessage(message);
        run.setCompletedAt(OffsetDateTime.now());
        auditRunRepository.save(run);
    }

    @Transactional
    public void markVerified(String jobId) {
        AuditRunEntity run = getRunOrThrow(jobId);
        run.setStatus(AuditStatus.VERIFIED);
        run.setCompletedAt(OffsetDateTime.now());
        auditRunRepository.save(run);
    }

    @Transactional(readOnly = true)
    public AuditReportSchema readReportPayload(String jobId) {
        AuditReportRecord report = findReport(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found for audit " + jobId));
        return readJson(report.reportJson(), AuditReportSchema.class);
    }

    private AuditRunEntity getRunOrThrow(String jobId) {
        return auditRunRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Audit not found: " + jobId));
    }

    private AuditEventRecord toRecord(AuditEventEntity entity) {
        return new AuditEventRecord(
                entity.getJobId(),
                entity.getSequence(),
                entity.getEventType(),
                entity.getStatus(),
                readJson(entity.getPayloadJson(), AuditStreamEventSchema.class)
        );
    }

    private AuditStreamEventSchema materializeStreamEvent(
            AuditStreamEventSchema source,
            long sequence,
            OffsetDateTime timestamp
    ) {
        AuditStreamEventSchema payload = new AuditStreamEventSchema();
        payload.setJobId(source.getJobId());
        payload.setEventId(String.valueOf(sequence));
        payload.setTimestamp(Date.from(timestamp.toInstant()));
        payload.setType(source.getType());
        payload.setStatus(source.getStatus());
        payload.setMessage(source.getMessage());
        payload.setStage(source.getStage());
        payload.setProgress(source.getProgress());
        payload.setRuleId(source.getRuleId());
        payload.setCheckStatus(source.getCheckStatus());
        payload.setSeverity(source.getSeverity());
        payload.setInstruction(source.getInstruction());
        payload.setDetail(source.getDetail());
        payload.setSelector(source.getSelector());
        payload.setMetric(source.getMetric());
        payload.setProducer(source.getProducer());
        payload.setSourceEventId(source.getSourceEventId());
        return payload;
    }

    private String writeJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to store audit payload.", exception);
        }
    }

    private <T> T readJson(String payloadJson, Class<T> type) {
        try {
            return objectMapper.readValue(payloadJson, type);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to read audit payload.", exception);
        }
    }
}
