package com.nabin.seogeo.project.service;

import com.nabin.seogeo.project.domain.NormalizedUrl;
import org.springframework.stereotype.Service;

import java.net.IDN;
import java.net.URI;
import java.util.ArrayDeque;
import java.util.Locale;

@Service
public class UrlNormalizationService {

    public NormalizedUrl normalizeUrl(String rawUrl) {
        String trimmed = rawUrl == null ? "" : rawUrl.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("URL must not be blank.");
        }

        URI uri = URI.create(trimmed);
        String scheme = normalizeScheme(uri.getScheme());
        String host = normalizeHost(uri.getHost());
        int port = normalizePort(uri.getPort(), scheme);
        String path = normalizePath(uri.getPath(), false);
        String origin = buildOrigin(scheme, host, port);
        String normalizedUrl = origin + path;
        if (uri.getQuery() != null && !uri.getQuery().isBlank()) {
            normalizedUrl = normalizedUrl + "?" + uri.getRawQuery();
        }
        return new NormalizedUrl(normalizedUrl, host, path, origin);
    }

    private String normalizeScheme(String scheme) {
        String normalized = scheme == null ? "https" : scheme.toLowerCase(Locale.ROOT);
        if (!"http".equals(normalized) && !"https".equals(normalized)) {
            throw new IllegalArgumentException("Only http and https URLs are supported.");
        }
        return normalized;
    }

    private String normalizeHost(String host) {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL host must not be blank.");
        }
        return IDN.toASCII(host.trim().toLowerCase(Locale.ROOT));
    }

    private int normalizePort(int port, String scheme) {
        if (port < 0) {
            return -1;
        }
        if (("http".equals(scheme) && port == 80) || ("https".equals(scheme) && port == 443)) {
            return -1;
        }
        return port;
    }

    private String buildOrigin(String scheme, String host, int port) {
        if (port < 0) {
            return scheme + "://" + host;
        }
        return scheme + "://" + host + ":" + port;
    }

    private String normalizePath(String rawPath, boolean folder) {
        String path = rawPath == null || rawPath.isBlank() ? "/" : rawPath;
        String[] segments = path.split("/");
        ArrayDeque<String> cleanedSegments = new ArrayDeque<>();
        for (String segment : segments) {
            if (segment == null || segment.isEmpty()) {
                continue;
            }
            cleanedSegments.add(segment);
        }
        String normalizedPath = "/" + String.join("/", cleanedSegments);
        if (normalizedPath.isBlank()) {
            normalizedPath = "/";
        }
        if (folder && !normalizedPath.endsWith("/")) {
            normalizedPath = normalizedPath + "/";
        }
        return normalizedPath;
    }
}
