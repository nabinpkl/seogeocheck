package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditPersistenceService;
import com.nabin.seogeo.audit.service.AuditReportSigner;
import io.temporal.spring.boot.ActivityImpl;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Map;

@Component
@ActivityImpl(taskQueues = "${seogeo.audit.task-queue}")
public class AuditActivitiesImpl implements AuditActivities {

    private final AuditPersistenceService auditPersistenceService;
    private final AuditReportSigner auditReportSigner;

    public AuditActivitiesImpl(
            AuditPersistenceService auditPersistenceService,
            AuditReportSigner auditReportSigner
    ) {
        this.auditPersistenceService = auditPersistenceService;
        this.auditReportSigner = auditReportSigner;
    }

    @Override
    public void createRun(String jobId, String targetUrl, OffsetDateTime requestedAt) {
        auditPersistenceService.ensureQueuedRun(jobId, targetUrl, requestedAt);
    }

    @Override
    public AuditEventRecord appendEvent(String jobId, String eventType, AuditStatus status, Map<String, Object> attributes) {
        return auditPersistenceService.appendEvent(jobId, eventType, status, attributes);
    }

    @Override
    public AuditReportRecord buildSignedReport(String jobId, String targetUrl, SeoAuditResult result) {
        return auditReportSigner.buildReport(jobId, targetUrl, result);
    }

    @Override
    public void persistReport(AuditReportRecord reportRecord) {
        auditPersistenceService.persistReport(reportRecord);
    }

    @Override
    public void markVerified(String jobId) {
        auditPersistenceService.markVerified(jobId);
    }

    @Override
    public void markFailed(String jobId, String message) {
        auditPersistenceService.markFailed(jobId, message);
    }
}
