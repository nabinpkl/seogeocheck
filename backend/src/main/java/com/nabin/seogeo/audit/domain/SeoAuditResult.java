package com.nabin.seogeo.audit.domain;

import com.nabin.seogeo.audit.contract.internal.generated.AuditDiagnostics;
import com.nabin.seogeo.audit.contract.internal.generated.AuditScoring;

import java.util.List;

public record SeoAuditResult(
        String requestedUrl,
        String finalUrl,
        String indexabilityVerdict,
        int score,
        AuditScoring scoring,
        List<SeoAuditCheck> checks,
        AuditDiagnostics auditDiagnostics
) {
}
