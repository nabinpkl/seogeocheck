package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.contract.generated.ReportCheck;
import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditEventEntity;
import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import com.nabin.seogeo.audit.persistence.AuditClaimTokenRepository;
import com.nabin.seogeo.audit.persistence.AuditReportEntity;
import com.nabin.seogeo.audit.persistence.AuditReportRepository;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
import com.nabin.seogeo.project.domain.NormalizedUrl;
import com.nabin.seogeo.project.persistence.AuditRunSummaryEntity;
import com.nabin.seogeo.project.persistence.AuditRunSummaryHighIssueEntity;
import com.nabin.seogeo.project.persistence.AuditRunSummaryHighIssueRepository;
import com.nabin.seogeo.project.persistence.AuditRunSummaryRepository;
import com.nabin.seogeo.project.service.UrlNormalizationService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Date;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuditPersistenceService {

    private final AuditRunRepository auditRunRepository;
    private final AuditEventRepository auditEventRepository;
    private final AuditReportRepository auditReportRepository;
    private final AuditClaimTokenRepository auditClaimTokenRepository;
    private final ObjectMapper objectMapper;
    private final AuditContractSchemaValidator auditContractSchemaValidator;
    private final UrlNormalizationService urlNormalizationService;
    private final AuditRunSummaryRepository auditRunSummaryRepository;
    private final AuditRunSummaryHighIssueRepository auditRunSummaryHighIssueRepository;

    public AuditPersistenceService(
            AuditRunRepository auditRunRepository,
            AuditEventRepository auditEventRepository,
            AuditReportRepository auditReportRepository,
            AuditClaimTokenRepository auditClaimTokenRepository,
            ObjectMapper objectMapper,
            AuditContractSchemaValidator auditContractSchemaValidator,
            UrlNormalizationService urlNormalizationService,
            AuditRunSummaryRepository auditRunSummaryRepository,
            AuditRunSummaryHighIssueRepository auditRunSummaryHighIssueRepository
    ) {
        this.auditRunRepository = auditRunRepository;
        this.auditEventRepository = auditEventRepository;
        this.auditReportRepository = auditReportRepository;
        this.auditClaimTokenRepository = auditClaimTokenRepository;
        this.objectMapper = objectMapper;
        this.auditContractSchemaValidator = auditContractSchemaValidator;
        this.urlNormalizationService = urlNormalizationService;
        this.auditRunSummaryRepository = auditRunSummaryRepository;
        this.auditRunSummaryHighIssueRepository = auditRunSummaryHighIssueRepository;
    }

    @Transactional
    public void createPendingRun(String jobId, String targetUrl, OffsetDateTime createdAt) {
        createPendingRun(jobId, targetUrl, createdAt, null);
    }

    @Transactional
    public void createPendingRun(String jobId, String targetUrl, OffsetDateTime createdAt, UUID ownerUserId) {
        if (auditRunRepository.existsById(jobId)) {
            return;
        }

        AuditRunEntity entity = new AuditRunEntity();
        entity.setJobId(jobId);
        entity.setTargetUrl(targetUrl);
        applyNormalizedUrl(entity, targetUrl);
        entity.setStatus(AuditStatus.QUEUED);
        entity.setCreatedAt(createdAt);
        entity.setOwnerUserId(ownerUserId);
        if (ownerUserId != null) {
            entity.setClaimedAt(createdAt);
        }
        auditRunRepository.save(entity);
    }

    @Transactional
    public void deletePendingRun(String jobId) {
        auditRunRepository.deleteById(jobId);
    }

    @Transactional
    public void ensureQueuedRun(String jobId, String targetUrl, OffsetDateTime requestedAt) {
        AuditRunEntity run = auditRunRepository.findByIdForUpdate(jobId)
                .orElseGet(() -> {
                    AuditRunEntity created = new AuditRunEntity();
                    created.setJobId(jobId);
                    created.setTargetUrl(targetUrl);
                    applyNormalizedUrl(created, targetUrl);
                    created.setCreatedAt(requestedAt);
                    return created;
                });

        run.setTargetUrl(targetUrl);
        applyNormalizedUrl(run, targetUrl);
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
    public Optional<AuditRunEntity> findVisibleRun(String jobId, UUID requesterUserId) {
        return findRun(jobId).filter(run -> isVisibleTo(run, requesterUserId));
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
        persistRunSummary(reportRecord);
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

    @Transactional
    public void claimRun(String jobId, UUID ownerUserId) {
        AuditRunEntity run = auditRunRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Audit not found: " + jobId));

        if (run.getOwnerUserId() == null) {
            run.setOwnerUserId(ownerUserId);
            run.setClaimedAt(OffsetDateTime.now());
            auditRunRepository.save(run);
            return;
        }

        if (Objects.equals(run.getOwnerUserId(), ownerUserId)) {
            if (run.getClaimedAt() == null) {
                run.setClaimedAt(OffsetDateTime.now());
                auditRunRepository.save(run);
            }
            return;
        }

        throw new AuditAlreadyClaimedException(jobId);
    }

    @Transactional
    public void deleteRun(String jobId) {
        auditClaimTokenRepository.deleteByJobIdIn(List.of(jobId));
        auditEventRepository.deleteByJobIdIn(List.of(jobId));
        auditReportRepository.deleteByJobIdIn(List.of(jobId));
        auditRunRepository.deleteById(jobId);
    }

    @Transactional(readOnly = true)
    public List<AccountAuditSummary> listOwnedAudits(UUID ownerUserId) {
        return auditRunRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId).stream()
                .map(run -> new AccountAuditSummary(
                        run.getJobId(),
                        run.getTargetUrl(),
                        run.getStatus(),
                        run.getCreatedAt(),
                        run.getCompletedAt(),
                        extractScore(run.getJobId()),
                        null,
                        null,
                        null
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public AuditReportSchema readReportPayload(String jobId) {
        AuditReportRecord report = findReport(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found for audit " + jobId));
        return readJson(report.reportJson(), AuditReportSchema.class);
    }

    public boolean isVisibleTo(AuditRunEntity run, UUID requesterUserId) {
        return requesterUserId != null && Objects.equals(run.getOwnerUserId(), requesterUserId);
    }

    private Integer extractScore(String jobId) {
        return auditReportRepository.findById(jobId)
                .map(AuditReportEntity::getReportJson)
                .map(reportJson -> readJson(reportJson, AuditReportSchema.class))
                .map(report -> report.getSummary() == null ? null : report.getSummary().getScore())
                .orElse(null);
    }

    private AuditRunEntity getRunOrThrow(String jobId) {
        return auditRunRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Audit not found: " + jobId));
    }

    private void applyNormalizedUrl(AuditRunEntity entity, String targetUrl) {
        NormalizedUrl normalizedUrl = urlNormalizationService.normalizeUrl(targetUrl);
        entity.setNormalizedUrl(normalizedUrl.normalizedUrl());
        entity.setNormalizedHost(normalizedUrl.normalizedHost());
        entity.setNormalizedPath(normalizedUrl.normalizedPath());
    }

    private void persistRunSummary(AuditReportRecord reportRecord) {
        AuditReportSchema report = readJson(reportRecord.reportJson(), AuditReportSchema.class);
        AuditRunSummaryEntity summary = new AuditRunSummaryEntity();
        summary.setJobId(reportRecord.jobId());
        summary.setScore(report.getSummary().getScore());
        summary.setIssueCount(report.getSummary().getIssueCount());
        summary.setPassedCheckCount(report.getSummary().getPassedCheckCount());
        summary.setNotApplicableCount(report.getSummary().getNotApplicableCount());
        summary.setSystemErrorCount(report.getSummary().getSystemErrorCount());
        summary.setGeneratedAt(reportRecord.generatedAt());

        List<ReportCheck> highIssues = report.getChecks() == null
                ? List.of()
                : report.getChecks().stream()
                .filter(this::isHighIssue)
                .sorted(Comparator.comparing(ReportCheck::getId, Comparator.nullsLast(String::compareTo)))
                .toList();

        summary.setHighIssueCount(highIssues.size());
        ReportCheck topIssue = highIssues.stream().findFirst().orElse(null);
        if (topIssue != null) {
            summary.setTopIssueKey(topIssue.getId());
            summary.setTopIssueLabel(topIssue.getLabel());
            summary.setTopIssueInstruction(topIssue.getInstruction());
        }

        auditRunSummaryRepository.save(summary);
        auditRunSummaryHighIssueRepository.deleteByJobId(reportRecord.jobId());
        for (ReportCheck highIssue : highIssues) {
            AuditRunSummaryHighIssueEntity issueEntity = new AuditRunSummaryHighIssueEntity();
            issueEntity.setJobId(reportRecord.jobId());
            issueEntity.setIssueKey(highIssue.getId());
            issueEntity.setIssueLabel(highIssue.getLabel());
            issueEntity.setIssueInstruction(highIssue.getInstruction());
            issueEntity.setSeverity(String.valueOf(highIssue.getSeverity()));
            auditRunSummaryHighIssueRepository.save(issueEntity);
        }
    }

    private boolean isHighIssue(ReportCheck check) {
        return check != null
                && check.getStatus() != null
                && "issue".equals(check.getStatus().value())
                && "high".equals(check.getSeverity());
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

    public static final class AuditAlreadyClaimedException extends RuntimeException {
        public AuditAlreadyClaimedException(String jobId) {
            super("Audit already claimed: " + jobId);
        }
    }
}
