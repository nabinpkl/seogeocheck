package com.nabin.seogeo.audit.domain;

import java.time.OffsetDateTime;

public record AuditReportRecord(
        String jobId,
        OffsetDateTime generatedAt,
        String reportJson,
        String signatureAlgorithm,
        String signatureValue
) {
}
