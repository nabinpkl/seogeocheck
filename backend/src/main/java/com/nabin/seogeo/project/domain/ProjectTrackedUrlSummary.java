package com.nabin.seogeo.project.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectTrackedUrlSummary(
        UUID id,
        String trackedUrl,
        String normalizedUrl,
        String normalizedHost,
        String normalizedPath,
        int auditCount,
        OffsetDateTime latestAuditAt,
        String latestAuditStatus,
        OffsetDateTime latestVerifiedAt,
        Integer currentScore,
        int currentCriticalIssueCount
) {
}
