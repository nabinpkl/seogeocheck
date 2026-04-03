package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.nabin.seogeo.audit.contract.internal.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.internal.generated.ReportCheck;
import com.nabin.seogeo.audit.contract.internal.generated.ReportSummary;
import com.nabin.seogeo.audit.contract.internal.generated.Signature;
import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.domain.AuditReportRecord;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Date;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuditReportSigner {

    private static final String HMAC_SHA_256 = "HMAC-SHA256";

    private final AuditProperties auditProperties;
    private final ObjectMapper objectMapper;
    private final ObjectMapper canonicalMapper;
    private final AuditContractSchemaValidator auditContractSchemaValidator;

    public AuditReportSigner(
            AuditProperties auditProperties,
            ObjectMapper objectMapper,
            AuditContractSchemaValidator auditContractSchemaValidator
    ) {
        this.auditProperties = auditProperties;
        this.objectMapper = objectMapper.copy()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.auditContractSchemaValidator = auditContractSchemaValidator;
        this.canonicalMapper = JsonMapper.builder()
                .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
                .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
    }

    public AuditReportRecord buildReport(String jobId, String targetUrl, SeoAuditResult result) {
        return buildReport(jobId, targetUrl, result, OffsetDateTime.now());
    }

    public AuditReportRecord buildReport(
            String jobId,
            String targetUrl,
            SeoAuditResult result,
            OffsetDateTime generatedAt
    ) {
        List<ReportCheck> checks = result.checks().stream()
                .map(this::toReportCheck)
                .toList();
        long issueCount = result.checks().stream()
                .filter(check -> "issue".equals(check.status()))
                .count();
        long passedCheckCount = result.checks().stream()
                .filter(check -> "passed".equals(check.status()))
                .count();
        long notApplicableCount = result.checks().stream()
            .filter(check -> "not_applicable".equals(check.status()))
            .count();
        long systemErrorCount = result.checks().stream()
            .filter(check -> "system_error".equals(check.status()))
            .count();
        String topIssue = selectTopIssue(result);

        ReportSummary summary = new ReportSummary();
        summary.setScore(result.score());
        summary.setStatus(AuditReportSchema.AuditStatus.VERIFIED);
        summary.setIndexabilityVerdict(toVerdictLabel(result.indexabilityVerdict()));
        summary.setTargetUrl(targetUrl);
        summary.setIssueCount(Math.toIntExact(issueCount));
        summary.setPassedCheckCount(Math.toIntExact(passedCheckCount));
        summary.setNotApplicableCount(Math.toIntExact(notApplicableCount));
        summary.setSystemErrorCount(Math.toIntExact(systemErrorCount));
        summary.setTopIssue(topIssue);

        AuditReportSchema report = new AuditReportSchema();
        report.setJobId(jobId);
        report.setStatus(AuditReportSchema.AuditStatus.VERIFIED);
        report.setGeneratedAt(Date.from(generatedAt.toInstant()));
        report.setTargetUrl(targetUrl);
        report.setReportType("SEO_SIGNALS_SIGNED_AUDIT");
        report.setIndexabilityVerdict(toVerdictLabel(result.indexabilityVerdict()));
        report.setSummary(summary);
        report.setChecks(checks);
        report.setScoring(result.scoring());
        report.setAuditDiagnostics(result.auditDiagnostics());

        String canonicalJson = writeCanonicalJson(report);
        String signatureValue = sign(canonicalJson);

        Signature signature = new Signature();
        signature.setPresent(true);
        signature.setAlgorithm(HMAC_SHA_256);
        signature.setValue(signatureValue);
        report.setSignature(signature);
        auditContractSchemaValidator.validateInternalReportPayload(report);

        return new AuditReportRecord(
                jobId,
                generatedAt,
                writeJson(report),
                HMAC_SHA_256,
                signatureValue
        );
    }

    private ReportCheck toReportCheck(SeoAuditCheck check) {
        ReportCheck payload = new ReportCheck();
        payload.setId(check.id());
        payload.setLabel(check.label());
        payload.setStatus(ReportCheck.CheckStatus.fromValue(check.status()));
        payload.setCategory(ReportCheck.AuditCategoryId.fromValue(check.category()));
        if (check.severity() != null && !check.severity().isBlank()) {
            payload.setSeverity(check.severity());
        }
        if (check.instruction() != null && !check.instruction().isBlank()) {
            payload.setInstruction(check.instruction());
        }
        if (check.detail() != null && !check.detail().isBlank()) {
            payload.setDetail(check.detail());
        }
        if (check.selector() != null && !check.selector().isBlank()) {
            payload.setSelector(check.selector());
        }
        if (check.metric() != null && !check.metric().isBlank()) {
            payload.setMetric(check.metric());
        }
        if (check.metadata() != null) {
            payload.setMetadata(check.metadata());
        }
        return payload;
    }

    private AuditReportSchema.IndexabilityVerdictLabel toVerdictLabel(String verdict) {
        return AuditReportSchema.IndexabilityVerdictLabel.fromValue(verdict);
    }

    private int severityRank(SeoAuditCheck check) {
        return switch (check.severity()) {
            case "high" -> 0;
            case "medium" -> 1;
            default -> 2;
        };
    }

    private String selectTopIssue(SeoAuditResult result) {
        List<SeoAuditCheck> issues = result.checks().stream()
                .filter(check -> "issue".equals(check.status()))
                .toList();
        if (issues.isEmpty()) {
            return "No major issues detected";
        }

        Map<String, Double> scoreImpacts = extractScoreImpacts(result.scoring());
        if (scoreImpacts.isEmpty()) {
            return issues.stream()
                    .min(Comparator.comparingInt(this::severityRank))
                    .map(SeoAuditCheck::label)
                    .orElse("No major issues detected");
        }

        SeoAuditCheck bestCheck = null;
        double bestImpact = Double.NEGATIVE_INFINITY;
        int bestSeverityRank = Integer.MAX_VALUE;
        for (SeoAuditCheck issue : issues) {
            double scoreImpact = scoreImpacts.getOrDefault(issue.id(), 0.0d);
            int issueSeverityRank = severityRank(issue);
            if (bestCheck == null
                    || Double.compare(scoreImpact, bestImpact) > 0
                    || (Double.compare(scoreImpact, bestImpact) == 0
                    && issueSeverityRank < bestSeverityRank)) {
                bestCheck = issue;
                bestImpact = scoreImpact;
                bestSeverityRank = issueSeverityRank;
            }
        }

        return bestCheck != null ? bestCheck.label() : "No major issues detected";
    }

    private Map<String, Double> extractScoreImpacts(Object scoring) {
        JsonNode rulesNode = objectMapper.valueToTree(scoring).at("/rules");
        if (!rulesNode.isArray()) {
            return Map.of();
        }

        Map<String, Double> scoreImpacts = new HashMap<>();
        for (JsonNode ruleNode : rulesNode) {
            JsonNode ruleIdNode = ruleNode.get("ruleId");
            JsonNode scoreImpactNode = ruleNode.get("scoreImpact");
            if (ruleIdNode == null || !ruleIdNode.isTextual() || scoreImpactNode == null
                    || !scoreImpactNode.isNumber()) {
                continue;
            }

            scoreImpacts.put(ruleIdNode.asText(), scoreImpactNode.asDouble());
        }

        return scoreImpacts;
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

    private String writeCanonicalJson(Object payload) {
        try {
            return canonicalMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize report canonically.", exception);
        }
    }

    private String writeJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize report.", exception);
        }
    }
}
