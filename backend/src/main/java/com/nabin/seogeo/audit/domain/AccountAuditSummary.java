package com.nabin.seogeo.audit.domain;

import java.time.OffsetDateTime;

public record AccountAuditSummary(
        String jobId,
        String targetUrl,
        AuditStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime completedAt,
        Integer score
) {
}
