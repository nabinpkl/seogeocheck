package com.nabin.seogeo.audit.domain;

import java.util.List;
import java.util.Map;

public record SeoAuditResult(
        String requestedUrl,
        String finalUrl,
        int score,
        Map<String, Integer> categoryScores,
        List<SeoAuditCheck> checks,
        Map<String, Object> rawSummary
) {
}
