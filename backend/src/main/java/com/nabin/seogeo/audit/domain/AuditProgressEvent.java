package com.nabin.seogeo.audit.domain;

import java.time.OffsetDateTime;

public record AuditProgressEvent(
        Integer schemaVersion,
        String eventId,
        String jobId,
        String producer,
        String eventType,
        String status,
        OffsetDateTime emittedAt,
        String message,
        String stage,
        Integer progress,
        String ruleId,
        String checkStatus,
        String severity,
        String instruction,
        String detail,
        String selector,
        String metric
) {
}
