package com.nabin.seogeo.audit.domain;

import com.nabin.seogeo.audit.contract.generated.CategoryScores;
import com.nabin.seogeo.audit.contract.generated.RawSummary;

import java.util.List;

public record SeoAuditResult(
        String requestedUrl,
        String finalUrl,
        String indexabilityVerdict,
        int score,
        CategoryScores categoryScores,
        List<SeoAuditCheck> checks,
        RawSummary rawSummary
) {
}
