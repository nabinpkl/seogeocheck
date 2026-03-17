package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditEventEntity;
import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import com.nabin.seogeo.audit.persistence.AuditReportEntity;
import com.nabin.seogeo.audit.persistence.AuditReportRepository;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuditPersistenceService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final AuditRunRepository auditRunRepository;
    private final AuditEventRepository auditEventRepository;
    private final AuditReportRepository auditReportRepository;
    private final ObjectMapper objectMapper;

    public AuditPersistenceService(
            AuditRunRepository auditRunRepository,
            AuditEventRepository auditEventRepository,
            AuditReportRepository auditReportRepository,
            ObjectMapper objectMapper
    ) {
        this.auditRunRepository = auditRunRepository;
        this.auditEventRepository = auditEventRepository;
        this.auditReportRepository = auditReportRepository;
        this.objectMapper = objectMapper;
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
    public AuditEventRecord appendEvent(String jobId, String eventType, AuditStatus status, Map<String, Object> attributes) {
        AuditRunEntity run = getRunOrThrow(jobId);
        long nextSequence = auditEventRepository.findMaxSequenceByJobId(jobId) + 1;
        OffsetDateTime timestamp = OffsetDateTime.now();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("jobId", jobId);
        payload.put("eventId", String.valueOf(nextSequence));
        payload.put("timestamp", timestamp.toString());
        payload.put("type", eventType);
        payload.put("status", status.name());
        payload.putAll(attributes);

        AuditEventEntity entity = new AuditEventEntity();
        entity.setJobId(jobId);
        entity.setSequence(nextSequence);
        entity.setEventType(eventType);
        entity.setStatus(status);
        entity.setPayloadJson(writeJson(payload));
        entity.setCreatedAt(timestamp);
        auditEventRepository.save(entity);

        if ("status".equals(eventType) && status == AuditStatus.STREAMING) {
            run.setStatus(AuditStatus.STREAMING);
            auditRunRepository.save(run);
        }

        return new AuditEventRecord(jobId, nextSequence, eventType, status, payload);
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
    public Map<String, Object> readReportPayload(String jobId) {
        AuditReportRecord report = findReport(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found for audit " + jobId));
        return readJson(report.reportJson());
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
                readJson(entity.getPayloadJson())
        );
    }

    private String writeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to store audit payload.", exception);
        }
    }

    private Map<String, Object> readJson(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to read audit payload.", exception);
        }
    }
}
