package com.nabin.seogeo.audit.domain;

import java.util.List;
import java.util.Map;

public record LighthouseAuditResult(
        String requestedUrl,
        String finalUrl,
        int score,
        Map<String, Integer> categoryScores,
        List<LighthouseAuditCheck> checks,
        Map<String, Object> rawSummary
) {
}
