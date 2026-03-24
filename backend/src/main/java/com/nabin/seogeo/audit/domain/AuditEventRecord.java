package com.nabin.seogeo.audit.domain;

import com.nabin.seogeo.audit.contract.generated.AuditStreamEventSchema;
public record AuditEventRecord(
        String jobId,
        long sequence,
        String eventType,
        AuditStatus status,
        AuditStreamEventSchema payload
) {
}
