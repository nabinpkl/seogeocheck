package com.nabin.seogeo.audit.domain;

import java.util.Map;

public record AuditEventRecord(
        String jobId,
        long sequence,
        String eventType,
        AuditStatus status,
        Map<String, Object> payload
) {
}
