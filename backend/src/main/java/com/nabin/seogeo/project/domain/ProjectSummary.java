package com.nabin.seogeo.project.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ProjectSummary(
        UUID id,
        String slug,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        int trackedUrlCount,
        int verifiedUrlCount,
        int auditCount,
        int activeAuditCount,
        OffsetDateTime latestAuditAt,
        Integer projectScore,
        ScoreTrend scoreTrend,
        int criticalIssueCount,
        int affectedUrlCount,
        List<ProjectTopIssue> topIssues
) {
    public record ScoreTrend(
            int improvedUrlCount,
            int declinedUrlCount,
            int flatUrlCount,
            int netScoreDelta
    ) {
    }

    public record ProjectTopIssue(
            String key,
            String label,
            String severity,
            int affectedUrlCount,
            String exampleInstruction
    ) {
    }
}
