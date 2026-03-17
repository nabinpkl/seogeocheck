package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.domain.LighthouseAuditCheck;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.LighthouseAuditResult;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.failure.ActivityFailure;
import io.temporal.spring.boot.WorkflowImpl;
import io.temporal.workflow.Workflow;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@WorkflowImpl(taskQueues = "${seogeo.audit.task-queue}")
public class AuditWorkflowImpl implements AuditWorkflow {

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
            LighthouseActivities lighthouseActivities = createLighthouseActivities(request);

            auditActivities.createRun(request.jobId(), request.targetUrl(), request.requestedAt());
            auditActivities.appendEvent(request.jobId(), "status", AuditStatus.QUEUED, Map.of(
                    "message", "Audit accepted. Getting your site review ready."
            ));
            auditActivities.appendEvent(request.jobId(), "status", AuditStatus.STREAMING, Map.of(
                    "message", "Reviewing your site's technical signals.",
                    "progress", 10
            ));

            LighthouseAuditResult result = lighthouseActivities.runLighthouseAudit(request.jobId(), request.targetUrl());
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

    private LighthouseActivities createLighthouseActivities(AuditWorkflowRequest request) {
        return Workflow.newActivityStub(
                LighthouseActivities.class,
                ActivityOptions.newBuilder()
                        .setTaskQueue(request.lighthouseTaskQueue())
                        .setStartToCloseTimeout(Duration.ofSeconds(request.lighthouseActivityTimeoutSeconds()))
                        .setRetryOptions(RetryOptions.newBuilder()
                                .setMaximumAttempts(3)
                                .build())
                        .build()
        );
    }

    private void emitAuditSignalEvents(String jobId, LighthouseAuditResult result) {
        List<LighthouseAuditCheck> checks = result.checks();

        if (checks.isEmpty()) {
            auditActivities.appendEvent(jobId, "status", AuditStatus.STREAMING, Map.of(
                    "message", "No major issues found so far.",
                    "progress", 70
            ));
            return;
        }

        int total = checks.size();
        for (int index = 0; index < total; index++) {
            LighthouseAuditCheck check = checks.get(index);
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
        String userMessage = "We couldn't finish reviewing this site. Please try again in a moment.";
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

    private String rootMessage(Exception exception) {
        if (exception instanceof ActivityFailure activityFailure && activityFailure.getCause() != null) {
            return rootMessage((Exception) activityFailure.getCause());
        }

        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return "The audit could not be completed.";
        }
        return message;
    }
}
