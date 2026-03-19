package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.ActivityImpl;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Profile("test")
@Component
@ActivityImpl(taskQueues = "${seogeo.seo-signals.task-queue:seogeo-seo-signals-test}")
public class FakeSeoSignalActivities implements SeoSignalActivities {

    private static final String TARGET_URL_UNREACHABLE = "TARGET_URL_UNREACHABLE";

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

        return new SeoAuditResult(
                targetUrl,
                targetUrl.endsWith("/") ? targetUrl : targetUrl + "/",
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
}
