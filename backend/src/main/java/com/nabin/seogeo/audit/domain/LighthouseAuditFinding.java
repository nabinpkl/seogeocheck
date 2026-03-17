package com.nabin.seogeo.audit.domain;

import java.util.Map;

public record LighthouseAuditFinding(
        String id,
        String label,
        String severity,
        String instruction,
        String selector,
        String metric,
        Map<String, Object> metadata
) {
}
