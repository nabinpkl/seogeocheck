package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.domain.LighthouseAuditResult;

public interface LighthouseSidecarClient {

    LighthouseAuditResult runAudit(String jobId, String targetUrl);
}
