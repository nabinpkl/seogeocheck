package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.SeoAuditResult;
import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface SeoSignalActivities {

    @ActivityMethod(name = "runSeoAudit")
    SeoAuditResult runSeoAudit(String jobId, String targetUrl);
}
