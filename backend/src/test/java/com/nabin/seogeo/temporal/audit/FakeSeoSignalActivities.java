package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.contract.generated.AuditWorkerProgressEventSchema;
import com.nabin.seogeo.audit.contract.generated.CategoryScores;
import com.nabin.seogeo.audit.contract.generated.RawSummary;
import com.nabin.seogeo.audit.contract.generated.ReportCheckMetadata;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditProgressProjectorService;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.ActivityImpl;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.time.OffsetDateTime;
import java.util.List;

@Profile("test")
@Component
@ActivityImpl(taskQueues = "${seogeo.seo-signals.task-queue:seogeo-seo-signals-test}")
public class FakeSeoSignalActivities implements SeoSignalActivities {

    private static final String TARGET_URL_UNREACHABLE = "TARGET_URL_UNREACHABLE";
    private final AuditProgressProjectorService auditProgressProjectorService;

    public FakeSeoSignalActivities(AuditProgressProjectorService auditProgressProjectorService) {
        this.auditProgressProjectorService = auditProgressProjectorService;
    }

    @Override
    public SeoAuditResult runSeoAudit(String jobId, String targetUrl) {
        try {
            Thread.sleep(350);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("The fake SEO audit activity was interrupted.", interruptedException);
        }

        if (targetUrl.contains("fail.example.com")) {
            throw new IllegalStateException("SEO audit worker refused to audit the target URL.");
        }

        if (targetUrl.contains("unreachable.example.com")) {
            throw ApplicationFailure.newNonRetryableFailure(
                    "The target URL could not be reached.",
                    TARGET_URL_UNREACHABLE
            );
        }

        project(jobId, progressEvent(
                jobId + ":stage:source_capture_complete",
                jobId,
                "status",
                "STREAMING",
                "Collected source HTML signals.",
                "source_capture_complete",
                25,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        ));
        project(jobId, progressEvent(
                jobId + ":rule:document-title",
                jobId,
                "check",
                "STREAMING",
                "Add a unique page title",
                null,
                null,
                "document-title",
                "issue",
                "high",
                "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
                null,
                "head > title",
                null
        ));
        project(jobId, progressEvent(
                jobId + ":rule:primary-heading",
                jobId,
                "check",
                "STREAMING",
                "Strengthen the primary heading",
                null,
                null,
                "primary-heading",
                "issue",
                "medium",
                "Use a single descriptive <h1> that matches the page's primary search intent.",
                null,
                "body h1",
                null
        ));
        project(jobId, progressEvent(
                jobId + ":rule:meta-description",
                jobId,
                "check",
                "STREAMING",
                "Meta description is present",
                null,
                null,
                "meta-description",
                "passed",
                null,
                null,
                "The page already offers a summary snippet for search results.",
                "head > meta[name=\"description\"]",
                null
        ));

        return new SeoAuditResult(
                targetUrl,
                targetUrl.endsWith("/") ? targetUrl : targetUrl + "/",
                "At Risk",
                86,
                categoryScores(100, 84, 82, 88, 83, 91, 100),
                List.of(
                        new SeoAuditCheck(
                                "document-title",
                                "Add a unique page title",
                                "issue",
                                "high",
                                "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
                                null,
                                "head > title",
                                null,
                                metadata("document_title", "source_html", (entry) -> entry.setLength(0))
                        ),
                        new SeoAuditCheck(
                                "primary-heading",
                                "Strengthen the primary heading",
                                "issue",
                                "medium",
                                "Use a single descriptive <h1> that matches the page's primary search intent.",
                                null,
                                "body h1",
                                null,
                                metadata("heading_structure", "source_html", (entry) -> entry.setH1Count(0))
                        ),
                        new SeoAuditCheck(
                                "meta-description",
                                "Meta description is present",
                                "passed",
                                null,
                                null,
                                "The page already offers a summary snippet for search results.",
                                "head > meta[name=\"description\"]",
                                null,
                                metadata("meta_description", "source_html", (entry) -> entry.setLength(100))
                        )
                ),
                rawSummary("seo-audit-worker")
        );
    }

    private void project(String jobId, AuditWorkerProgressEventSchema event) {
        auditProgressProjectorService.project(event, "test-progress-topic", 0, 0L);
    }

    private static AuditWorkerProgressEventSchema progressEvent(
            String eventId,
            String jobId,
            String eventType,
            String status,
            String message,
            String stage,
            Integer progress,
            String ruleId,
            String checkStatus,
            String severity,
            String instruction,
            String detail,
            String selector,
            String metric
    ) {
        AuditWorkerProgressEventSchema event = new AuditWorkerProgressEventSchema();
        event.setSchemaVersion(1);
        event.setEventId(eventId);
        event.setJobId(jobId);
        event.setProducer("seo-audit-worker");
        event.setEventType(AuditWorkerProgressEventSchema.EventType.fromValue(eventType));
        event.setStatus(AuditWorkerProgressEventSchema.Status.fromValue(status));
        event.setEmittedAt(Date.from(OffsetDateTime.now().toInstant()));
        event.setMessage(message);
        event.setStage(stage);
        event.setProgress(progress);
        event.setRuleId(ruleId);
        if (checkStatus != null) {
            event.setCheckStatus(AuditWorkerProgressEventSchema.CheckStatus.fromValue(checkStatus));
        }
        if (severity != null) {
            event.setSeverity(AuditWorkerProgressEventSchema.Severity.fromValue(severity));
        }
        event.setInstruction(instruction);
        event.setDetail(detail);
        event.setSelector(selector);
        event.setMetric(metric);
        return event;
    }

    private static CategoryScores categoryScores(
            int reachability,
            int crawlability,
            int indexability,
            int sitewide,
            int contentVisibility,
            int metadata,
            int discovery
    ) {
        CategoryScores scores = new CategoryScores();
        scores.setReachability(reachability);
        scores.setCrawlability(crawlability);
        scores.setIndexability(indexability);
        scores.setSitewide(sitewide);
        scores.setContentVisibility(contentVisibility);
        scores.setMetadata(metadata);
        scores.setDiscovery(discovery);
        return scores;
    }

    private static RawSummary rawSummary(String worker) {
        RawSummary summary = new RawSummary();
        summary.setWorker(worker);
        return summary;
    }

    private static ReportCheckMetadata metadata(
            String problemFamily,
            String evidenceSource,
            java.util.function.Consumer<ReportCheckMetadata> customizer
    ) {
        ReportCheckMetadata metadata = new ReportCheckMetadata();
        metadata.setProblemFamily(ReportCheckMetadata.ProblemFamily.fromValue(problemFamily));
        metadata.setEvidenceSource(ReportCheckMetadata.EvidenceSource.fromValue(evidenceSource));
        customizer.accept(metadata);
        return metadata;
    }
}
