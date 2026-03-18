package com.nabin.seogeo.audit.domain;

import java.util.Map;

public record SeoAuditCheck(
        String id,
        String label,
        String status,
        String severity,
        String instruction,
        String detail,
        String selector,
        String metric,
        Map<String, Object> metadata
) {
}
