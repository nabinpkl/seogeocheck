package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.contract.consumer.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.domain.AuditEventRecord;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import io.temporal.activity.ActivityInterface;

import java.time.OffsetDateTime;

@ActivityInterface
public interface AuditActivities {

    void createRun(String jobId, String targetUrl, OffsetDateTime requestedAt);

    AuditEventRecord appendEvent(AuditStreamEventSchema event);

    AuditReportRecord buildSignedReport(String jobId, String targetUrl, SeoAuditResult result);

    void persistReport(AuditReportRecord reportRecord);

    void markVerified(String jobId);

    void markFailed(String jobId, String message);
}
