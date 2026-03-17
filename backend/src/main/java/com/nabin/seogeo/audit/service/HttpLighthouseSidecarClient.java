package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpLighthouseSidecarClient implements LighthouseSidecarClient {

    private final RestClient restClient;

    public HttpLighthouseSidecarClient(RestClient lighthouseRestClient) {
        this.restClient = lighthouseRestClient;
    }

    @Override
    public LighthouseAuditResult runAudit(String jobId, String targetUrl) {
        return restClient.post()
                .uri("/audit")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new LighthouseAuditRequest(jobId, targetUrl))
                .retrieve()
                .body(LighthouseAuditResult.class);
    }

    public record LighthouseAuditRequest(String jobId, String url) {
    }
}
