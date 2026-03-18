package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.SeoAuditCheck;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.failure.ActivityFailure;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.WorkflowImpl;
import io.temporal.workflow.Workflow;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@WorkflowImpl(taskQueues = "${seogeo.audit.task-queue}")
public class AuditWorkflowImpl implements AuditWorkflow {

    private static final String TARGET_URL_UNREACHABLE = "TARGET_URL_UNREACHABLE";

    private final AuditActivities auditActivities = Workflow.newActivityStub(
            AuditActivities.class,
            ActivityOptions.newBuilder()
                    .setStartToCloseTimeout(Duration.ofSeconds(60))
                    .setRetryOptions(RetryOptions.newBuilder()
                            .setMaximumAttempts(3)
                            .build())
                    .build()
    );

    @Override
    public void runAudit(AuditWorkflowRequest request) {
        try {
            SeoSignalActivities seoSignalActivities = createSeoSignalActivities(request);

            auditActivities.createRun(request.jobId(), request.targetUrl(), request.requestedAt());
            auditActivities.appendEvent(request.jobId(), "status", AuditStatus.QUEUED, Map.of(
                    "message", "Audit accepted. Getting your site review ready."
            ));
            auditActivities.appendEvent(request.jobId(), "status", AuditStatus.STREAMING, Map.of(
                    "message", "Reviewing your site's SEO signals.",
                    "progress", 10
            ));

            SeoAuditResult result = seoSignalActivities.runSeoAudit(request.jobId(), request.targetUrl());
            emitAuditSignalEvents(request.jobId(), result);

            auditActivities.persistReport(auditActivities.buildSignedReport(request.jobId(), request.targetUrl(), result));
            auditActivities.markVerified(request.jobId());
            auditActivities.appendEvent(request.jobId(), "complete", AuditStatus.COMPLETE, Map.of(
                    "message", "Your site review is complete. Results are ready.",
                    "progress", 100
            ));
        } catch (Exception exception) {
            handleFailure(request.jobId(), exception);
        }
    }

    private SeoSignalActivities createSeoSignalActivities(AuditWorkflowRequest request) {
        return Workflow.newActivityStub(
                SeoSignalActivities.class,
                ActivityOptions.newBuilder()
                        .setTaskQueue(request.seoSignalsTaskQueue())
                        .setStartToCloseTimeout(Duration.ofSeconds(request.seoSignalsActivityTimeoutSeconds()))
                        .setRetryOptions(RetryOptions.newBuilder()
                                .setMaximumAttempts(3)
                                .build())
                        .build()
        );
    }

    private void emitAuditSignalEvents(String jobId, SeoAuditResult result) {
        List<SeoAuditCheck> checks = result.checks();

        if (checks.isEmpty()) {
            auditActivities.appendEvent(jobId, "status", AuditStatus.STREAMING, Map.of(
                    "message", "No major issues found so far.",
                    "progress", 70
            ));
            return;
        }

        int total = checks.size();
        for (int index = 0; index < total; index++) {
            SeoAuditCheck check = checks.get(index);
            int progress = Math.min(90, 25 + ((index + 1) * 55 / total));
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("message", check.label());
            payload.put("checkStatus", check.status());
            payload.put("progress", progress);
            if (check.severity() != null && !check.severity().isBlank()) {
                payload.put("severity", check.severity());
            }
            if (check.instruction() != null && !check.instruction().isBlank()) {
                payload.put("instruction", check.instruction());
            }
            if (check.detail() != null && !check.detail().isBlank()) {
                payload.put("detail", check.detail());
            }
            if (check.selector() != null && !check.selector().isBlank()) {
                payload.put("selector", check.selector());
            }
            if (check.metric() != null && !check.metric().isBlank()) {
                payload.put("metric", check.metric());
            }
            auditActivities.appendEvent(jobId, "check", AuditStatus.STREAMING, payload);
        }
    }

    private void handleFailure(String jobId, Exception exception) {
        String internalMessage = rootMessage(exception);
        String userMessage = toUserMessage(exception, internalMessage);
        try {
            auditActivities.markFailed(jobId, userMessage);
            auditActivities.appendEvent(jobId, "error", AuditStatus.FAILED, Map.of(
                    "message", userMessage
            ));
        } catch (Exception ignored) {
            Workflow.getLogger(AuditWorkflowImpl.class)
                    .error("Unable to persist audit failure for {}. Root cause: {}", jobId, internalMessage, ignored);
        }
    }

    private String toUserMessage(Throwable failure, String internalMessage) {
        if (isUrlUnreachableFailure(failure)) {
            return "We couldn't reach that URL. Make sure the site is publicly accessible and try again.";
        }

        return "We couldn't finish reviewing this site. Please try again in a moment.";
    }

    private boolean isUrlUnreachableFailure(Throwable failure) {
        if (failure instanceof ActivityFailure activityFailure && activityFailure.getCause() != null) {
            return isUrlUnreachableFailure(activityFailure.getCause());
        }

        if (failure instanceof ApplicationFailure applicationFailure
                && TARGET_URL_UNREACHABLE.equals(applicationFailure.getType())) {
            return true;
        }

        return false;
    }

    private String rootMessage(Throwable failure) {
        if (failure instanceof ActivityFailure activityFailure && activityFailure.getCause() != null) {
            return rootMessage(activityFailure.getCause());
        }

        String message = failure.getMessage();
        if (message == null || message.isBlank()) {
            return "The audit could not be completed.";
        }
        return message;
    }
}
