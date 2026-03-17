package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface LighthouseActivities {

    @ActivityMethod(name = "runLighthouseAudit")
    LighthouseAuditResult runLighthouseAudit(String jobId, String targetUrl);
}
