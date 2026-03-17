package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import io.temporal.activity.ActivityInterface;

import java.time.OffsetDateTime;
import java.util.Map;

@ActivityInterface
public interface AuditActivities {

    void createRun(String jobId, String targetUrl, OffsetDateTime requestedAt);

    AuditEventRecord appendEvent(String jobId, String eventType, AuditStatus status, Map<String, Object> attributes);

    AuditReportRecord buildSignedReport(String jobId, String targetUrl, LighthouseAuditResult result);

    void persistReport(AuditReportRecord reportRecord);

    void markVerified(String jobId);

    void markFailed(String jobId, String message);
}
