package com.nabin.seogeo.temporal.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.contract.generated.AuditWorkerProgressEventSchema;
import com.nabin.seogeo.audit.contract.generated.AuditDiagnostics;
import com.nabin.seogeo.audit.contract.generated.AuditScoring;
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
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();
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
                minimalScoring(86),
                List.of(
                        new SeoAuditCheck(
                                "document-title",
                                "Add a unique page title",
                                "issue",
                                "metadata",
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
                                "contentVisibility",
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
                                "metadata",
                                null,
                                null,
                                "The page already offers a summary snippet for search results.",
                                "head > meta[name=\"description\"]",
                                null,
                                metadata("meta_description", "source_html", (entry) -> entry.setLength(100))
                        )
                ),
                minimalDiagnostics("seo-audit-worker")
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

    private static AuditScoring minimalScoring(int overallScore) {
        try {
            return OBJECT_MAPPER.readValue(
                    """
                    {
                      "model": "weighted_rule_scoring",
                      "overall": {
                        "score": %d,
                        "confidence": 100,
                        "earnedWeight": 40,
                        "availableWeight": 40,
                        "totalPossibleWeight": 40
                      },
                      "categories": {
                        "reachability": { "score": 100, "confidence": 100, "earnedWeight": 5, "availableWeight": 5, "totalPossibleWeight": 5, "categoryWeight": 15 },
                        "crawlability": { "score": 84, "confidence": 100, "earnedWeight": 8.4, "availableWeight": 10, "totalPossibleWeight": 10, "categoryWeight": 20 },
                        "indexability": { "score": 82, "confidence": 100, "earnedWeight": 8.2, "availableWeight": 10, "totalPossibleWeight": 10, "categoryWeight": 20 },
                        "sitewide": { "score": 88, "confidence": 100, "earnedWeight": 8.8, "availableWeight": 10, "totalPossibleWeight": 10, "categoryWeight": 15 },
                        "contentVisibility": { "score": 83, "confidence": 100, "earnedWeight": 8.3, "availableWeight": 10, "totalPossibleWeight": 10, "categoryWeight": 15 },
                        "metadata": { "score": 91, "confidence": 100, "earnedWeight": 9.1, "availableWeight": 10, "totalPossibleWeight": 10, "categoryWeight": 10 },
                        "discovery": { "score": 100, "confidence": 100, "earnedWeight": 5, "availableWeight": 5, "totalPossibleWeight": 5, "categoryWeight": 5 }
                      },
                      "rules": []
                    }
                    """.formatted(overallScore),
                    AuditScoring.class
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to build fake audit scoring.", exception);
        }
    }

    private static AuditDiagnostics minimalDiagnostics(String worker) {
        try {
            return OBJECT_MAPPER.readValue(
                    """
                    {
                      "capture": {
                        "worker": "%s",
                        "statusCode": 200,
                        "contentType": "text/html; charset=utf-8",
                        "capturePasses": ["source_html"]
                      },
                      "surfaces": {
                        "sourceHtml": {
                          "wordCount": 120,
                          "sameOriginCrawlableLinkCount": 1,
                          "nonCrawlableLinkCount": 0,
                          "emptyAnchorTextCount": 0,
                          "genericAnchorTextCount": 0,
                          "metaRefreshTagCount": 0,
                          "headingOutlineCount": 1,
                          "headingHierarchySkipCount": 0,
                          "emptyHeadingCount": 0,
                          "repeatedHeadingCount": 0,
                          "linkedImageCount": 0,
                          "linkedImageMissingAltCount": 0,
                          "bodyImageCount": 0,
                          "eligibleBodyImageCount": 0,
                          "bodyImageMissingAltCount": 0,
                          "structuredDataKinds": []
                        },
                        "renderedDom": null,
                        "renderComparison": {
                          "sourceOnlyCriticalIssues": 0,
                          "renderedOnlySignals": 0,
                          "mismatches": 0,
                          "renderDependencyRisk": "unknown"
                        }
                      },
                      "controls": {
                        "xRobotsTag": { "value": null, "blocksIndexing": false },
                        "robotsControl": { "status": "clear", "entries": [], "targets": {}, "sameTargetConflicts": [], "targetedOverrides": [], "unsupportedTokens": [], "malformedTokens": [], "effectiveIndexing": "index", "effectiveFollowing": "follow", "effectiveSnippet": null, "effectiveArchive": null, "effectiveTranslate": null, "effectiveMaxSnippet": null, "effectiveMaxImagePreview": null, "effectiveMaxVideoPreview": null, "effectiveTarget": "all", "hasBlockingNoindex": false, "hasNoarchiveDirective": false, "hasNotranslateDirective": false },
                        "canonicalControl": { "status": "clear", "candidates": [], "htmlCount": 1, "headerCount": 0, "uniqueTargetCount": 1, "uniqueTargets": ["https://example.com/"], "invalidCandidates": [], "resolvedCanonicalUrl": "https://example.com/", "consistency": "self" },
                        "canonicalSelfReferenceControl": { "status": "self", "expectsSelfReference": true, "finalUrl": "https://example.com/", "resolvedCanonicalUrl": "https://example.com/" },
                        "canonicalTargetControl": { "status": "self", "targetUrl": "https://example.com/", "finalUrl": "https://example.com/", "resolvedCanonicalUrl": "https://example.com/", "redirectCount": 0, "inspection": null, "robotsControl": null, "reusedCurrentPageInspection": true },
                        "metaRefreshControl": { "status": "clear", "tagCount": 0, "immediateRedirectCount": 0, "timedRedirectCount": 0, "refreshOnlyCount": 0, "malformedCount": 0, "redirectCount": 0, "entries": [] },
                        "alternateLanguageControl": { "status": "none", "annotations": [], "validAnnotations": [], "invalidAnnotations": [], "conflicts": [], "groupedByLanguage": {} },
                        "linkDiscoveryControl": { "status": "clear", "internalCrawlableLinkCount": 1, "internalNofollowCount": 0, "blockedByRelCount": 0, "affectedLinks": [] },
                        "internalLinkCoverageControl": { "status": "good", "sameOriginCrawlableLinkCount": 1, "minimumRecommendedCount": 1 },
                        "titleControl": { "status": "good", "length": 42, "minLength": 15, "maxLength": 60 },
                        "metaDescriptionControl": { "status": "good", "length": 120, "minLength": 50, "maxLength": 160 },
                        "headingControl": { "status": "single", "h1Count": 1, "headingCount": 1, "skippedTransitions": [], "hasMultipleH1": false, "hasSkippedLevels": false },
                        "headingQualityControl": { "status": "good", "emptyHeadingCount": 0, "repeatedHeadingCount": 0, "firstHeadingNotH1": false, "repeatedHeadings": [] },
                        "bodyImageAltControl": { "status": "complete", "totalImageCount": 0, "eligibleImageCount": 0, "missingAltCount": 0, "excludedMissingSrcCount": 0, "excludedDecorativeCount": 0, "excludedTrackingPixelCount": 0, "missingAltImages": [] },
                        "soft404Control": { "status": "clear", "wordCount": 120, "title": "Example", "firstH1Text": "Example", "matchedPhrases": [], "signalCount": 0, "titleLooksLikeError": false, "headingLooksLikeError": false, "metaDescriptionLooksLikeError": false, "thinContent": false, "missingPrimarySignals": false, "canonicalContradicts": false },
                        "langControl": { "status": "valid", "value": "en", "canonicalValue": "en" },
                        "socialMetadataControl": { "status": "clear", "openGraph": { "status": "complete", "presentFields": [], "missingFields": [], "duplicateFields": [], "fieldValues": { "title": null, "description": null, "type": null, "url": null, "image": null } }, "twitter": { "status": "complete", "presentFields": [], "missingFields": [], "duplicateFields": [], "fieldValues": { "card": null, "title": null, "description": null, "image": null } } },
                        "socialUrlControl": { "status": "clear", "fieldCount": 0, "invalidFields": [], "fields": [] },
                        "metadataAlignmentControl": { "status": "aligned", "firstH1Text": "Example", "titleSharedTokenCount": 1, "metaDescriptionSharedTokenCount": 1, "titleH1Mismatch": false, "weakMetaDescriptionAlignment": false },
                        "robotsPreviewControl": { "status": "clear", "effectiveSnippet": null, "effectiveMaxSnippet": null, "effectiveMaxImagePreview": null, "effectiveMaxVideoPreview": null, "restrictiveSignals": [], "conflicts": [] },
                        "viewportControl": { "status": "valid", "content": "width=device-width, initial-scale=1", "hasDeviceWidth": true, "hasInitialScale": true, "disablesZoom": false },
                        "faviconControl": { "status": "present", "iconCount": 0, "rels": [], "links": [] },
                        "headHygieneControl": { "status": "clear", "duplicateHeadCounts": { "title": 1, "metaDescription": 1, "viewport": 1, "openGraphTitle": 0, "openGraphDescription": 0, "openGraphType": 0, "openGraphUrl": 0, "openGraphImage": 0, "twitterCard": 0, "twitterTitle": 0, "twitterDescription": 0, "twitterImage": 0 }, "problematicFields": [] },
                        "structuredDataControl": { "status": "none", "totalJsonLdBlocks": 0, "validJsonLdBlocks": 0, "invalidJsonLdBlocks": 0, "emptyJsonLdBlocks": 0, "missingContextBlocks": 0, "missingTypeBlocks": 0, "blocks": [] },
                        "robotsTxt": { "status": "allowed", "allowsCrawl": true, "evaluatedUserAgent": "Googlebot", "matchedDirective": null, "matchedPattern": null, "fetchStatusCode": 200, "url": "https://example.com/robots.txt", "finalUrl": "https://example.com/robots.txt", "error": null },
                        "redirectChain": { "status": "ok", "totalRedirects": 0, "finalUrlChanged": false, "finalUrl": "https://example.com/", "chain": [], "error": null }
                      },
                      "sitewide": null,
                      "analysis": {
                        "indexabilitySignals": {
                          "blockingSignals": [],
                          "riskSignals": [],
                          "unknownSignals": []
                        }
                      }
                    }
                    """.formatted(worker),
                    AuditDiagnostics.class
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to build fake audit diagnostics.", exception);
        }
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
