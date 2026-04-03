package com.nabin.seogeo.audit.domain;

import com.nabin.seogeo.audit.contract.internal.generated.ReportCheckMetadata;

public record SeoAuditCheck(
        String id,
        String label,
        String status,
        String category,
        String severity,
        String instruction,
        String detail,
        String selector,
        String metric,
        ReportCheckMetadata metadata
) {
}
