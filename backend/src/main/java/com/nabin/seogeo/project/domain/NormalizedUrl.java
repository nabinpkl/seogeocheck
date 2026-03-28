package com.nabin.seogeo.project.domain;

public record NormalizedUrl(
        String normalizedUrl,
        String normalizedHost,
        String normalizedPath,
        String origin
) {
}
