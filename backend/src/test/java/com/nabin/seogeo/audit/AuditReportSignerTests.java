package com.nabin.seogeo.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.generated.CategoryScores;
import com.nabin.seogeo.audit.contract.generated.RawSummary;
import com.nabin.seogeo.audit.contract.generated.ReportCheckMetadata;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditContractSchemaValidator;
import com.nabin.seogeo.audit.service.AuditReportSigner;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditReportSignerTests {

    @Test
        void reportSignatureIsDeterministicForTheSameInput() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper();
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
                categoryScores(100, 92, 84, 88, 91, 100),
                List.of(new SeoAuditCheck(
                        "document-title",
                        "Add a unique page title",
                        "issue",
                        "high",
                        "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
                        null,
                        "head > title",
                        null,
                        metadata("document_title", "source_html", (entry) -> entry.setLength(0))
                ), new SeoAuditCheck(
                        "meta-description",
                        "Meta description is present",
                        "passed",
                        null,
                        null,
                        "Search engines can already read a summary for this page.",
                        "head > meta[name=\"description\"]",
                        null,
                        metadata("meta_description", "source_html", (entry) -> entry.setLength(100))
                ), new SeoAuditCheck(
                        "canonical-target-health",
                        "Canonical target health is not applicable yet",
                        "not_applicable",
                        null,
                        null,
                        "A single valid canonical target is not available yet, so target health cannot be evaluated.",
                        "head > link[rel=\"canonical\"]",
                        "canonical-target-health",
                        metadata("canonical_controls", "source_html", (entry) -> {
                            entry.setReasonCode(ReportCheckMetadata.ReasonCode.fromValue("missing_prerequisite"));
                            entry.setBlockedBy(List.of("canonical-signals"));
                        })
                ), new SeoAuditCheck(
                        "alternate-language-scan",
                        "Could not verify alternate language annotations",
                        "system_error",
                        null,
                        null,
                        "The audit worker timed out while collecting alternate language headers.",
                        "head > link[rel=\"alternate\"]",
                        "alternate-language-annotations",
                        metadata("alternate_language_controls", "source_html", (entry) -> {
                            entry.setReasonCode(ReportCheckMetadata.ReasonCode.fromValue("timeout"));
                            entry.setRetryable(true);
                        })
                )),
                rawSummary("seo-audit-worker")
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
    }

    @Test
    void reportSchemaValidatorRejectsUndocumentedMetadataFields() throws Exception {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        ObjectMapper objectMapper = new ObjectMapper();
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
                categoryScores(100, 100, 100, 100, 100, 100),
                List.of(new SeoAuditCheck(
                        "document-title",
                        "Page title is present",
                        "passed",
                        null,
                        null,
                        "The page has a title.",
                        "head > title",
                        null,
                        metadata("document_title", "source_html", (entry) -> entry.setLength(42))
                )),
                rawSummary("seo-audit-worker")
        );

        var report = signer.buildReport("audit_invalid", "https://example.com", result);
        Map<String, Object> payload = objectMapper.readValue(report.reportJson(), new TypeReference<>() {});
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) ((Map<String, Object>) ((List<?>) payload.get("checks")).getFirst()).get("metadata");
        metadata.put("unexpected", true);

        assertThatThrownBy(() -> validator.validateReportPayload(payload))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid audit report");
    }

    @Test
    void signerAcceptsCurrentWorkerFixtureWithExpandedMetadata() throws Exception {
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

            assertThat(roundTrippedResult.at("/checks/21/metadata/canonicalControl/candidates/0/surface").asText())
                    .isEqualTo("html");
            assertThat(roundTrippedResult.at("/checks/28/metadata/alternateLanguageControl/annotations/0/hreflang").asText())
                    .isEqualTo("de");
            assertThat(roundTrippedResult.at("/rawSummary/alternateLanguageControl/groupedByLanguage/en/0/href").asText())
                    .isEqualTo("https://www.linkedin.com/");
            assertThat(roundTrippedResult.at("/rawSummary/robotsControl/targets/all/archive").asText())
                    .isEqualTo("noarchive");

            var report = signer.buildReport("audit_fixture", "https://example.com", result);
            AuditReportSchema payload = objectMapper.readValue(report.reportJson(), AuditReportSchema.class);

            assertThat(payload.getChecks()).isNotEmpty();
            assertThat(payload.getRawSummary()).isNotNull();
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

        RawSummary rawSummary = objectMapper.readValue(
                """
                {
                  "worker": "seo-audit-worker",
                  "scoring": {
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
                        "categoryWeight": 20
                      },
                      "crawlability": {
                        "score": 70,
                        "confidence": 100,
                        "earnedWeight": 7,
                        "availableWeight": 10,
                        "totalPossibleWeight": 10,
                        "categoryWeight": 25
                      },
                      "indexability": {
                        "score": 100,
                        "confidence": 100,
                        "earnedWeight": 5,
                        "availableWeight": 5,
                        "totalPossibleWeight": 5,
                        "categoryWeight": 25
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
                }
                """,
                RawSummary.class
        );

        SeoAuditResult result = new SeoAuditResult(
                "https://example.com",
                "https://example.com/",
                "At Risk",
                78,
                categoryScores(100, 70, 100, 100, 70, 50),
                List.of(
                        new SeoAuditCheck(
                                "low-impact-high-issue",
                                "High severity but lower score impact",
                                "issue",
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
                                "medium",
                                "Resolve this crawlability problem.",
                                "This issue affects a higher-weight rule.",
                                "head > meta[name=\"robots\"]",
                                null,
                                metadata("robots_controls", "source_html", (entry) -> {})
                        )
                ),
                rawSummary
        );

        var report = signer.buildReport("audit_top_issue", "https://example.com", result);
        AuditReportSchema payload = objectMapper.readValue(report.reportJson(), AuditReportSchema.class);

        assertThat(payload.getSummary().getTopIssue())
                .isEqualTo("Medium severity with the highest score impact");
    }

    private static CategoryScores categoryScores(
            int reachability,
            int crawlability,
            int indexability,
            int contentVisibility,
            int metadata,
            int discovery
    ) {
        CategoryScores scores = new CategoryScores();
        scores.setReachability(reachability);
        scores.setCrawlability(crawlability);
        scores.setIndexability(indexability);
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
