package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.LighthouseAuditCheck;
import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuditReportSigner {

    private static final String HMAC_SHA_256 = "HMAC-SHA256";

    private final AuditProperties auditProperties;
    private final ObjectMapper objectMapper;
    private final ObjectMapper canonicalMapper;

    public AuditReportSigner(AuditProperties auditProperties, ObjectMapper objectMapper) {
        this.auditProperties = auditProperties;
        this.objectMapper = objectMapper;
        this.canonicalMapper = JsonMapper.builder()
                .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
                .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                .build();
    }

    public AuditReportRecord buildReport(String jobId, String targetUrl, LighthouseAuditResult result) {
        return buildReport(jobId, targetUrl, result, OffsetDateTime.now());
    }

    public AuditReportRecord buildReport(
            String jobId,
            String targetUrl,
            LighthouseAuditResult result,
            OffsetDateTime generatedAt
    ) {
        List<Map<String, Object>> checks = result.checks().stream()
                .map(this::toCheckPayload)
                .toList();
        long issueCount = result.checks().stream()
                .filter(check -> "issue".equals(check.status()))
                .count();
        long passedCheckCount = result.checks().stream()
                .filter(check -> "passed".equals(check.status()))
                .count();
        String topIssue = result.checks().stream()
                .filter(check -> "issue".equals(check.status()))
                .min(Comparator.comparingInt(this::severityRank))
                .map(LighthouseAuditCheck::label)
                .orElse("No major issues detected");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("score", result.score());
        summary.put("status", AuditStatus.VERIFIED.name());
        summary.put("targetUrl", targetUrl);
        summary.put("issueCount", issueCount);
        summary.put("passedCheckCount", passedCheckCount);
        summary.put("topIssue", topIssue);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("jobId", jobId);
        report.put("status", AuditStatus.VERIFIED.name());
        report.put("generatedAt", generatedAt.toString());
        report.put("targetUrl", targetUrl);
        report.put("reportType", "LIGHTHOUSE_SIGNED_AUDIT");
        report.put("summary", summary);
        report.put("checks", checks);
        report.put("categories", result.categoryScores());
        report.put("rawSummary", result.rawSummary());

        String canonicalJson = writeCanonicalJson(report);
        String signatureValue = sign(canonicalJson);

        Map<String, Object> signature = new LinkedHashMap<>();
        signature.put("present", true);
        signature.put("algorithm", HMAC_SHA_256);
        signature.put("value", signatureValue);
        report.put("signature", signature);

        return new AuditReportRecord(
                jobId,
                generatedAt,
                writeJson(report),
                HMAC_SHA_256,
                signatureValue
        );
    }

    private Map<String, Object> toCheckPayload(LighthouseAuditCheck check) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", check.id());
        payload.put("label", check.label());
        payload.put("status", check.status());
        if (check.severity() != null && !check.severity().isBlank()) {
            payload.put("severity", check.severity());
        }
        if (check.instruction() != null && !check.instruction().isBlank()) {
            payload.put("instruction", check.instruction());
        }
        if (check.detail() != null && !check.detail().isBlank()) {
            payload.put("detail", check.detail());
        }
        if (check.selector() != null && !check.selector().isBlank()) {
            payload.put("selector", check.selector());
        }
        if (check.metric() != null && !check.metric().isBlank()) {
            payload.put("metric", check.metric());
        }
        if (check.metadata() != null && !check.metadata().isEmpty()) {
            payload.put("metadata", check.metadata());
        }
        return payload;
    }

    private int severityRank(LighthouseAuditCheck check) {
        return switch (check.severity()) {
            case "high" -> 0;
            case "medium" -> 1;
            default -> 2;
        };
    }

    private String sign(String canonicalJson) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    auditProperties.getReportSigningSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));
            byte[] digest = mac.doFinal(canonicalJson.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to sign audit report.", exception);
        }
    }

    private String writeCanonicalJson(Map<String, Object> payload) {
        try {
            return canonicalMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize report canonically.", exception);
        }
    }

    private String writeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize report.", exception);
        }
    }
}
