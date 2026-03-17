package com.nabin.seogeo.audit;

import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.LighthouseAuditCheck;
import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
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

        LighthouseAuditResult result = new LighthouseAuditResult(
                "https://example.com",
                "https://example.com/",
                88,
                Map.of("seo", 88, "performance", 70),
                List.of(new LighthouseAuditCheck(
                        "document-title",
                        "Add a unique page title",
                        "issue",
                        "high",
                        "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
                        null,
                        "head > title",
                        null,
                        Map.of("score", 0)
                ), new LighthouseAuditCheck(
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
                Map.of("lighthouseVersion", "test")
        );

        OffsetDateTime generatedAt = OffsetDateTime.parse("2026-03-16T00:00:00Z");

        String firstSignature = signer.buildReport("audit_fixed", "https://example.com", result, generatedAt).signatureValue();
        String secondSignature = signer.buildReport("audit_fixed", "https://example.com", result, generatedAt).signatureValue();

        assertThat(firstSignature).hasSize(64);
        assertThat(secondSignature).hasSize(64);
        assertThat(firstSignature).isNotBlank();
        assertThat(secondSignature).isNotBlank();
        assertThat(firstSignature).isEqualTo(secondSignature);
    }
}
