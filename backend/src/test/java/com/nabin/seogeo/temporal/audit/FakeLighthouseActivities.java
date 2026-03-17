package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.LighthouseAuditCheck;
import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.ActivityImpl;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Profile("test")
@Component
@ActivityImpl(taskQueues = "${seogeo.lighthouse.task-queue:seogeo-lighthouse-test}")
public class FakeLighthouseActivities implements LighthouseActivities {

    private static final String LIGHTHOUSE_URL_UNREACHABLE = "LIGHTHOUSE_URL_UNREACHABLE";

    @Override
    public LighthouseAuditResult runLighthouseAudit(String jobId, String targetUrl) {
        try {
            Thread.sleep(350);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("The fake lighthouse activity was interrupted.", interruptedException);
        }

        if (targetUrl.contains("fail.example.com")) {
            throw new IllegalStateException("Lighthouse worker refused to audit the target URL.");
        }

        if (targetUrl.contains("unreachable.example.com")) {
            throw ApplicationFailure.newNonRetryableFailure(
                    "The target URL could not be reached.",
                    LIGHTHOUSE_URL_UNREACHABLE
            );
        }

        return new LighthouseAuditResult(
                targetUrl,
                targetUrl.endsWith("/") ? targetUrl : targetUrl + "/",
                86,
                Map.of(
                        "performance", 74,
                        "accessibility", 96,
                        "bestPractices", 88,
                        "seo", 86
                ),
                List.of(
                        new LighthouseAuditCheck(
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
                        new LighthouseAuditCheck(
                                "largest-contentful-paint",
                                "Improve largest contentful paint",
                                "issue",
                                "high",
                                "Optimize the LCP element by prioritizing the hero asset, reducing server delay, and trimming render-blocking work.",
                                null,
                                null,
                                "LCP",
                                Map.of("displayValue", "4.0 s")
                        ),
                        new LighthouseAuditCheck(
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
                        "fetchTime", "2026-03-16T00:00:00Z",
                        "lighthouseVersion", "test"
                )
        );
    }
}
