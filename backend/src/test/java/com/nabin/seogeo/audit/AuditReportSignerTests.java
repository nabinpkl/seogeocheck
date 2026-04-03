package com.nabin.seogeo.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.contract.internal.generated.AuditDiagnostics;
import com.nabin.seogeo.audit.contract.internal.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.internal.generated.AuditScoring;
import com.nabin.seogeo.audit.contract.internal.generated.ReportCheckMetadata;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditContractSchemaValidator;
import com.nabin.seogeo.audit.service.AuditReportSigner;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditReportSignerTests {

    @Test
    void reportSignatureIsDeterministicForTheSameInput() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AuditReportSigner signer = new AuditReportSigner(
                auditProperties,
                objectMapper,
                new AuditContractSchemaValidator(objectMapper)
        );

        SeoAuditResult result = new SeoAuditResult(
                "https://example.com",
                "https://example.com/",
                "At Risk",
                88,
                minimalScoring(objectMapper, 88),
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
                                "meta-description",
                                "Meta description is present",
                                "passed",
                                "metadata",
                                null,
                                null,
                                "Search engines can already read a summary for this page.",
                                "head > meta[name=\"description\"]",
                                null,
                                metadata("meta_description", "source_html", (entry) -> entry.setLength(100))
                        ),
                        new SeoAuditCheck(
                                "canonical-target-health",
                                "Canonical target health is not applicable yet",
                                "not_applicable",
                                "indexability",
                                null,
                                null,
                                "A single valid canonical target is not available yet, so target health cannot be evaluated.",
                                "head > link[rel=\"canonical\"]",
                                "canonical-target-health",
                                metadata("canonical_controls", "source_html", (entry) -> {
                                    entry.setReasonCode(ReportCheckMetadata.ReasonCode.fromValue("missing_prerequisite"));
                                    entry.setBlockedBy(List.of("canonical-signals"));
                                })
                        ),
                        new SeoAuditCheck(
                                "alternate-language-scan",
                                "Could not verify alternate language annotations",
                                "system_error",
                                "metadata",
                                null,
                                null,
                                "The audit worker timed out while collecting alternate language headers.",
                                "head > link[rel=\"alternate\"]",
                                "alternate-language-annotations",
                                metadata("alternate_language_controls", "source_html", (entry) -> {
                                    entry.setReasonCode(ReportCheckMetadata.ReasonCode.fromValue("timeout"));
                                    entry.setRetryable(true);
                                })
                        )
                ),
                minimalDiagnostics(objectMapper, "seo-audit-worker")
        );

        OffsetDateTime generatedAt = OffsetDateTime.parse("2026-03-16T00:00:00Z");

        var firstReport = signer.buildReport("audit_fixed", "https://example.com", result, generatedAt);
        var secondReport = signer.buildReport("audit_fixed", "https://example.com", result, generatedAt);

        assertThat(firstReport.signatureValue()).hasSize(64);
        assertThat(secondReport.signatureValue()).hasSize(64);
        assertThat(firstReport.signatureValue()).isNotBlank();
        assertThat(secondReport.signatureValue()).isNotBlank();
        assertThat(firstReport.signatureValue()).isEqualTo(secondReport.signatureValue());
        assertThat(firstReport.reportJson()).contains("SEO_SIGNALS_SIGNED_AUDIT");
        assertThat(firstReport.reportJson()).contains("\"indexabilityVerdict\":\"At Risk\"");

        AuditReportSchema payload = objectMapper.readValue(
                firstReport.reportJson(),
                AuditReportSchema.class
        );
        assertThat(payload.getSummary().getIssueCount()).isEqualTo(1);
        assertThat(payload.getSummary().getPassedCheckCount()).isEqualTo(1);
        assertThat(payload.getSummary().getNotApplicableCount()).isEqualTo(1);
        assertThat(payload.getSummary().getSystemErrorCount()).isEqualTo(1);
        assertThat(payload.getScoring()).isNotNull();
        assertThat(payload.getAuditDiagnostics()).isNotNull();
    }

    @Test
    void reportSchemaValidatorRejectsUndocumentedMetadataFields() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AuditContractSchemaValidator validator = new AuditContractSchemaValidator(objectMapper);
        AuditReportSigner signer = new AuditReportSigner(
                auditProperties,
                objectMapper,
                validator
        );

        SeoAuditResult result = new SeoAuditResult(
                "https://example.com",
                "https://example.com/",
                "Indexable",
                100,
                minimalScoring(objectMapper, 100),
                List.of(new SeoAuditCheck(
                        "document-title",
                        "Page title is present",
                        "passed",
                        "metadata",
                        null,
                        null,
                        "The page has a title.",
                        "head > title",
                        null,
                        metadata("document_title", "source_html", (entry) -> entry.setLength(42))
                )),
                minimalDiagnostics(objectMapper, "seo-audit-worker")
        );

        var report = signer.buildReport("audit_invalid", "https://example.com", result);
        Map<String, Object> payload = objectMapper.readValue(report.reportJson(), new TypeReference<>() {});
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) ((Map<String, Object>) ((List<?>) payload.get("checks")).getFirst()).get("metadata");
        metadata.put("unexpected", true);

        assertThatThrownBy(() -> validator.validateInternalReportPayload(payload))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid internal audit report");
    }

    @Test
    void signerAcceptsCurrentWorkerFixtureWithExpandedDiagnostics() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AuditReportSigner signer = new AuditReportSigner(
                auditProperties,
                objectMapper,
                new AuditContractSchemaValidator(objectMapper)
        );

        try (InputStream fixtureStream = getClass().getResourceAsStream("/fixtures/linkedin-worker-result.json")) {
            assertThat(fixtureStream).isNotNull();
            SeoAuditResult result = objectMapper.readValue(fixtureStream, SeoAuditResult.class);
            var roundTrippedResult = objectMapper.valueToTree(result);

            assertThat(roundTrippedResult.at("/checks/0/category").asText())
                    .isEqualTo("indexability");
            assertThat(roundTrippedResult.at("/checks/1/metadata/alternateLanguageControl/annotations/0/hreflang").asText())
                    .isEqualTo("de");
            assertThat(roundTrippedResult.at("/auditDiagnostics/controls/alternateLanguageControl/groupedByLanguage/en/0/href").asText())
                    .isEqualTo("https://www.linkedin.com/");
            assertThat(roundTrippedResult.at("/auditDiagnostics/controls/robotsControl/targets/all/archive").asText())
                    .isEqualTo("noarchive");

            var report = signer.buildReport("audit_fixture", "https://example.com", result);
            AuditReportSchema payload = objectMapper.readValue(report.reportJson(), AuditReportSchema.class);

            assertThat(payload.getChecks()).isNotEmpty();
            assertThat(payload.getAuditDiagnostics()).isNotNull();
            assertThat(payload.getScoring()).isNotNull();
            assertThat(payload.getSignature().getValue()).isNotBlank();
        }
    }

    @Test
    void signerChoosesTopIssueByScoreImpactBeforeSeverity() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AuditReportSigner signer = new AuditReportSigner(
                auditProperties,
                objectMapper,
                new AuditContractSchemaValidator(objectMapper)
        );

        AuditScoring scoring = objectMapper.readValue(
                """
                {
                  "model": "weighted_rule_scoring",
                  "overall": {
                    "score": 78,
                    "confidence": 100,
                    "earnedWeight": 31.5,
                    "availableWeight": 40,
                    "totalPossibleWeight": 40
                  },
                  "categories": {
                    "reachability": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 15
                    },
                    "crawlability": {
                      "score": 70,
                      "confidence": 100,
                      "earnedWeight": 7,
                      "availableWeight": 10,
                      "totalPossibleWeight": 10,
                      "categoryWeight": 20
                    },
                    "indexability": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 20
                    },
                    "sitewide": {
                      "score": 100,
                      "confidence": 0,
                      "earnedWeight": 0,
                      "availableWeight": 0,
                      "totalPossibleWeight": 0,
                      "categoryWeight": 15
                    },
                    "contentVisibility": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 15
                    },
                    "metadata": {
                      "score": 70,
                      "confidence": 100,
                      "earnedWeight": 7,
                      "availableWeight": 10,
                      "totalPossibleWeight": 10,
                      "categoryWeight": 10
                    },
                    "discovery": {
                      "score": 50,
                      "confidence": 100,
                      "earnedWeight": 2.5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 5
                    }
                  },
                  "rules": [
                    {
                      "ruleId": "high-impact-medium-issue",
                      "categoryId": "crawlability",
                      "status": "issue",
                      "severity": "medium",
                      "ruleWeight": 5,
                      "earnedWeight": 0,
                      "includedInScore": true,
                      "exclusionReason": null,
                      "scoreImpact": 5
                    },
                    {
                      "ruleId": "low-impact-high-issue",
                      "categoryId": "metadata",
                      "status": "issue",
                      "severity": "high",
                      "ruleWeight": 3,
                      "earnedWeight": 0,
                      "includedInScore": true,
                      "exclusionReason": null,
                      "scoreImpact": 3
                    }
                  ]
                }
                """,
                AuditScoring.class
        );

        SeoAuditResult result = new SeoAuditResult(
                "https://example.com",
                "https://example.com/",
                "At Risk",
                78,
                scoring,
                List.of(
                        new SeoAuditCheck(
                                "low-impact-high-issue",
                                "High severity but lower score impact",
                                "issue",
                                "metadata",
                                "high",
                                "Resolve this metadata problem.",
                                "This issue is severe, but it affects a lower-weight rule.",
                                "head > title",
                                null,
                                metadata("document_title", "source_html", (entry) -> entry.setLength(0))
                        ),
                        new SeoAuditCheck(
                                "high-impact-medium-issue",
                                "Medium severity with the highest score impact",
                                "issue",
                                "crawlability",
                                "medium",
                                "Resolve this crawlability problem.",
                                "This issue affects a higher-weight rule.",
                                "head > meta[name=\"robots\"]",
                                null,
                                metadata("robots_controls", "source_html", (entry) -> {})
                        )
                ),
                minimalDiagnostics(objectMapper, "seo-audit-worker")
        );

        var report = signer.buildReport("audit_top_issue", "https://example.com", result);
        AuditReportSchema payload = objectMapper.readValue(report.reportJson(), AuditReportSchema.class);

        assertThat(payload.getSummary().getTopIssue())
                .isEqualTo("Medium severity with the highest score impact");
    }

    private static AuditScoring minimalScoring(ObjectMapper objectMapper, int overallScore) throws Exception {
        return objectMapper.readValue(
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
                    "reachability": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 15
                    },
                    "crawlability": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 10,
                      "availableWeight": 10,
                      "totalPossibleWeight": 10,
                      "categoryWeight": 20
                    },
                    "indexability": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 10,
                      "availableWeight": 10,
                      "totalPossibleWeight": 10,
                      "categoryWeight": 20
                    },
                    "sitewide": {
                      "score": 100,
                      "confidence": 0,
                      "earnedWeight": 0,
                      "availableWeight": 0,
                      "totalPossibleWeight": 0,
                      "categoryWeight": 15
                    },
                    "contentVisibility": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 10,
                      "availableWeight": 10,
                      "totalPossibleWeight": 10,
                      "categoryWeight": 15
                    },
                    "metadata": {
                      "score": 100,
                      "confidence": 100,
                      "earnedWeight": 5,
                      "availableWeight": 5,
                      "totalPossibleWeight": 5,
                      "categoryWeight": 10
                    },
                    "discovery": {
                      "score": 0,
                      "confidence": 0,
                      "earnedWeight": 0,
                      "availableWeight": 0,
                      "totalPossibleWeight": 0,
                      "categoryWeight": 5
                    }
                  },
                  "rules": []
                }
                """.formatted(overallScore),
                AuditScoring.class
        );
    }

    private static AuditDiagnostics minimalDiagnostics(ObjectMapper objectMapper, String worker) throws Exception {
        return objectMapper.readValue(
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
                    "xRobotsTag": {
                      "value": null,
                      "blocksIndexing": false
                    },
                    "robotsControl": {
                      "status": "clear",
                      "entries": [],
                      "targets": {
                        "all": {
                          "entries": [],
                          "indexingValues": ["index"],
                          "followingValues": ["follow"],
                          "snippetValues": [],
                          "archiveValues": ["noarchive"],
                          "translateValues": [],
                          "maxSnippetValues": [],
                          "maxImagePreviewValues": [],
                          "maxVideoPreviewValues": [],
                          "indexing": "index",
                          "following": "follow",
                          "snippet": null,
                          "archive": "noarchive",
                          "translate": null,
                          "maxSnippet": null,
                          "maxImagePreview": null,
                          "maxVideoPreview": null
                        }
                      },
                      "sameTargetConflicts": [],
                      "targetedOverrides": [],
                      "unsupportedTokens": [],
                      "malformedTokens": [],
                      "effectiveIndexing": "index",
                      "effectiveFollowing": "follow",
                      "effectiveSnippet": null,
                      "effectiveArchive": "noarchive",
                      "effectiveTranslate": null,
                      "effectiveMaxSnippet": null,
                      "effectiveMaxImagePreview": null,
                      "effectiveMaxVideoPreview": null,
                      "effectiveTarget": "all",
                      "hasBlockingNoindex": false,
                      "hasNoarchiveDirective": true,
                      "hasNotranslateDirective": false
                    },
                    "canonicalControl": {
                      "status": "clear",
                      "candidates": [
                        {
                          "surface": "html",
                          "href": "https://example.com/",
                          "resolvedUrl": "https://example.com/",
                          "status": "valid"
                        }
                      ],
                      "htmlCount": 1,
                      "headerCount": 0,
                      "uniqueTargetCount": 1,
                      "uniqueTargets": ["https://example.com/"],
                      "invalidCandidates": [],
                      "resolvedCanonicalUrl": "https://example.com/",
                      "consistency": "self"
                    },
                    "canonicalSelfReferenceControl": {
                      "status": "self",
                      "expectsSelfReference": true,
                      "finalUrl": "https://example.com/",
                      "resolvedCanonicalUrl": "https://example.com/"
                    },
                    "canonicalTargetControl": {
                      "status": "self",
                      "targetUrl": "https://example.com/",
                      "finalUrl": "https://example.com/",
                      "resolvedCanonicalUrl": "https://example.com/",
                      "redirectCount": 0,
                      "inspection": null,
                      "robotsControl": null,
                      "reusedCurrentPageInspection": true
                    },
                    "metaRefreshControl": {
                      "status": "clear",
                      "tagCount": 0,
                      "immediateRedirectCount": 0,
                      "timedRedirectCount": 0,
                      "refreshOnlyCount": 0,
                      "malformedCount": 0,
                      "redirectCount": 0,
                      "entries": []
                    },
                    "alternateLanguageControl": {
                      "status": "present",
                      "annotations": [
                        {
                          "surface": "html",
                          "href": "https://www.linkedin.com/",
                          "rel": "alternate",
                          "hreflang": "en",
                          "media": null,
                          "type": null,
                          "status": "valid",
                          "resolvedUrl": "https://www.linkedin.com/"
                        },
                        {
                          "surface": "html",
                          "href": "https://de.linkedin.com/",
                          "rel": "alternate",
                          "hreflang": "de",
                          "media": null,
                          "type": null,
                          "status": "valid",
                          "resolvedUrl": "https://de.linkedin.com/"
                        }
                      ],
                      "validAnnotations": [
                        {
                          "surface": "html",
                          "href": "https://www.linkedin.com/",
                          "rel": "alternate",
                          "hreflang": "en",
                          "media": null,
                          "type": null,
                          "status": "valid",
                          "resolvedUrl": "https://www.linkedin.com/"
                        },
                        {
                          "surface": "html",
                          "href": "https://de.linkedin.com/",
                          "rel": "alternate",
                          "hreflang": "de",
                          "media": null,
                          "type": null,
                          "status": "valid",
                          "resolvedUrl": "https://de.linkedin.com/"
                        }
                      ],
                      "invalidAnnotations": [],
                      "conflicts": [],
                      "groupedByLanguage": {
                        "en": [
                          {
                            "surface": "html",
                            "href": "https://www.linkedin.com/",
                            "rel": "alternate",
                            "hreflang": "en",
                            "media": null,
                            "type": null,
                            "status": "valid",
                            "resolvedUrl": "https://www.linkedin.com/"
                          }
                        ],
                        "de": [
                          {
                            "surface": "html",
                            "href": "https://de.linkedin.com/",
                            "rel": "alternate",
                            "hreflang": "de",
                            "media": null,
                            "type": null,
                            "status": "valid",
                            "resolvedUrl": "https://de.linkedin.com/"
                          }
                        ]
                      }
                    },
                    "linkDiscoveryControl": {
                      "status": "clear",
                      "internalCrawlableLinkCount": 1,
                      "internalNofollowCount": 0,
                      "blockedByRelCount": 0,
                      "affectedLinks": []
                    },
                    "internalLinkCoverageControl": {
                      "status": "good",
                      "sameOriginCrawlableLinkCount": 1,
                      "minimumRecommendedCount": 1
                    },
                    "titleControl": {
                      "status": "good",
                      "length": 42,
                      "minLength": 15,
                      "maxLength": 60
                    },
                    "metaDescriptionControl": {
                      "status": "good",
                      "length": 120,
                      "minLength": 50,
                      "maxLength": 160
                    },
                    "headingControl": {
                      "status": "single",
                      "h1Count": 1,
                      "headingCount": 1,
                      "skippedTransitions": [],
                      "hasMultipleH1": false,
                      "hasSkippedLevels": false
                    },
                    "headingQualityControl": {
                      "status": "good",
                      "emptyHeadingCount": 0,
                      "repeatedHeadingCount": 0,
                      "firstHeadingNotH1": false,
                      "repeatedHeadings": []
                    },
                    "bodyImageAltControl": {
                      "status": "complete",
                      "totalImageCount": 0,
                      "eligibleImageCount": 0,
                      "missingAltCount": 0,
                      "excludedMissingSrcCount": 0,
                      "excludedDecorativeCount": 0,
                      "excludedTrackingPixelCount": 0,
                      "missingAltImages": []
                    },
                    "soft404Control": {
                      "status": "clear",
                      "wordCount": 120,
                      "title": "Example",
                      "firstH1Text": "Example",
                      "matchedPhrases": [],
                      "signalCount": 0,
                      "titleLooksLikeError": false,
                      "headingLooksLikeError": false,
                      "metaDescriptionLooksLikeError": false,
                      "thinContent": false,
                      "missingPrimarySignals": false,
                      "canonicalContradicts": false
                    },
                    "langControl": {
                      "status": "valid",
                      "value": "en",
                      "canonicalValue": "en"
                    },
                    "socialMetadataControl": {
                      "status": "clear",
                      "openGraph": {
                        "status": "complete",
                        "presentFields": ["title", "description", "type", "url"],
                        "missingFields": [],
                        "duplicateFields": [],
                        "fieldValues": {
                          "title": "Example",
                          "description": "Example summary",
                          "type": "website",
                          "url": "https://example.com/",
                          "image": null
                        }
                      },
                      "twitter": {
                        "status": "complete",
                        "presentFields": ["card", "title", "description"],
                        "missingFields": [],
                        "duplicateFields": [],
                        "fieldValues": {
                          "card": "summary",
                          "title": "Example",
                          "description": "Example summary",
                          "image": null
                        }
                      }
                    },
                    "socialUrlControl": {
                      "status": "clear",
                      "fieldCount": 1,
                      "invalidFields": [],
                      "fields": [
                        {
                          "field": "openGraphUrl",
                          "rawValue": "https://example.com/",
                          "status": "valid",
                          "resolvedUrl": "https://example.com/"
                        }
                      ]
                    },
                    "metadataAlignmentControl": {
                      "status": "aligned",
                      "firstH1Text": "Example",
                      "titleSharedTokenCount": 2,
                      "metaDescriptionSharedTokenCount": 2,
                      "titleH1Mismatch": false,
                      "weakMetaDescriptionAlignment": false
                    },
                    "robotsPreviewControl": {
                      "status": "clear",
                      "effectiveSnippet": null,
                      "effectiveMaxSnippet": null,
                      "effectiveMaxImagePreview": null,
                      "effectiveMaxVideoPreview": null,
                      "restrictiveSignals": [],
                      "conflicts": []
                    },
                    "viewportControl": {
                      "status": "valid",
                      "content": "width=device-width, initial-scale=1",
                      "hasDeviceWidth": true,
                      "hasInitialScale": true,
                      "disablesZoom": false
                    },
                    "faviconControl": {
                      "status": "present",
                      "iconCount": 1,
                      "rels": ["icon"],
                      "links": [
                        {
                          "href": "https://example.com/favicon.ico",
                          "rel": "icon",
                          "sizes": null,
                          "type": "image/x-icon"
                        }
                      ]
                    },
                    "headHygieneControl": {
                      "status": "clear",
                      "duplicateHeadCounts": {
                        "title": 1,
                        "metaDescription": 1,
                        "viewport": 1,
                        "openGraphTitle": 1,
                        "openGraphDescription": 1,
                        "openGraphType": 1,
                        "openGraphUrl": 1,
                        "openGraphImage": 0,
                        "twitterCard": 1,
                        "twitterTitle": 1,
                        "twitterDescription": 1,
                        "twitterImage": 0
                      },
                      "problematicFields": []
                    },
                    "structuredDataControl": {
                      "status": "none",
                      "totalJsonLdBlocks": 0,
                      "validJsonLdBlocks": 0,
                      "invalidJsonLdBlocks": 0,
                      "emptyJsonLdBlocks": 0,
                      "missingContextBlocks": 0,
                      "missingTypeBlocks": 0,
                      "blocks": []
                    },
                    "robotsTxt": {
                      "status": "allowed",
                      "allowsCrawl": true,
                      "evaluatedUserAgent": "Googlebot",
                      "matchedDirective": null,
                      "matchedPattern": null,
                      "fetchStatusCode": 200,
                      "url": "https://example.com/robots.txt",
                      "finalUrl": "https://example.com/robots.txt",
                      "error": null
                    },
                    "redirectChain": {
                      "status": "ok",
                      "totalRedirects": 0,
                      "finalUrlChanged": false,
                      "finalUrl": "https://example.com/",
                      "chain": [],
                      "error": null
                    }
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
