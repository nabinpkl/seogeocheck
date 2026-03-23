package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.AuditProgressEvent;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditProgressProjectorService;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.ActivityImpl;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

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

        project(jobId, new AuditProgressEvent(
                1,
                jobId + ":stage:source_capture_complete",
                jobId,
                "seo-audit-worker",
                "status",
                "STREAMING",
                OffsetDateTime.now(),
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
        project(jobId, new AuditProgressEvent(
                1,
                jobId + ":rule:document-title",
                jobId,
                "seo-audit-worker",
                "check",
                "STREAMING",
                OffsetDateTime.now(),
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
        project(jobId, new AuditProgressEvent(
                1,
                jobId + ":rule:primary-heading",
                jobId,
                "seo-audit-worker",
                "check",
                "STREAMING",
                OffsetDateTime.now(),
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
        project(jobId, new AuditProgressEvent(
                1,
                jobId + ":rule:meta-description",
                jobId,
                "seo-audit-worker",
                "check",
                "STREAMING",
                OffsetDateTime.now(),
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
                Map.of(
                        "reachability", 100,
                        "crawlability", 84,
                        "indexability", 82,
                        "contentVisibility", 83,
                        "metadata", 91
                ),
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
                                Map.of("score", 0)
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
                                Map.of("score", 42)
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
                                Map.of("score", 100)
                        )
                ),
                Map.of(
                        "worker", "fake-seo-audit-worker",
                        "fetchTime", "2026-03-16T00:00:00Z"
                )
        );
    }

    private void project(String jobId, AuditProgressEvent event) {
        auditProgressProjectorService.project(event, "test-progress-topic", 0, 0L);
    }
}
