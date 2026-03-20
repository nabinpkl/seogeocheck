package com.nabin.seogeo.audit;

import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import com.nabin.seogeo.audit.service.AuditReportSigner;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AuditReportSignerTests {

    @Test
    void reportSignatureIsDeterministicForTheSameInput() {
        AuditProperties auditProperties = new AuditProperties();
        auditProperties.setReportSigningSecret("test-signing-secret");
        AuditReportSigner signer = new AuditReportSigner(auditProperties, new com.fasterxml.jackson.databind.ObjectMapper());

        SeoAuditResult result = new SeoAuditResult(
                "https://example.com",
                "https://example.com/",
                "At Risk",
                88,
                Map.of(
                        "reachability", 100,
                        "crawlability", 92,
                        "indexability", 84,
                        "contentVisibility", 88,
                        "metadata", 91
                ),
                List.of(new SeoAuditCheck(
                        "document-title",
                        "Add a unique page title",
                        "issue",
                        "high",
                        "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
                        null,
                        "head > title",
                        null,
                        Map.of("score", 0)
                ), new SeoAuditCheck(
                        "meta-description",
                        "Meta description is present",
                        "passed",
                        null,
                        null,
                        "Search engines can already read a summary for this page.",
                        "head > meta[name=\"description\"]",
                        null,
                        Map.of("score", 100)
                )),
                Map.of("worker", "seo-audit-worker")
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
    }
}
