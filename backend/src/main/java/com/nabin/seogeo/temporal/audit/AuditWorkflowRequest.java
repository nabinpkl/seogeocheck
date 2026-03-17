package com.nabin.seogeo.temporal.audit;

import java.time.OffsetDateTime;

public record AuditWorkflowRequest(
        String jobId,
        String targetUrl,
        OffsetDateTime requestedAt
) {
}
