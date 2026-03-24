package com.nabin.seogeo.temporal.audit;

import com.nabin.seogeo.audit.contract.generated.AuditStreamEventSchema;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.domain.SeoAuditResult;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.failure.ActivityFailure;
import io.temporal.failure.ApplicationFailure;
import io.temporal.spring.boot.WorkflowImpl;
import io.temporal.workflow.Workflow;
import java.time.Duration;

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
            auditActivities.appendEvent(streamEvent(
                    request.jobId(),
                    "status",
                    AuditStatus.QUEUED,
                    "Audit accepted. Getting your site review ready.",
                    null
            ));
            auditActivities.appendEvent(streamEvent(
                    request.jobId(),
                    "status",
                    AuditStatus.STREAMING,
                    "Reviewing your site's SEO signals.",
                    10
            ));

            SeoAuditResult result = seoSignalActivities.runSeoAudit(request.jobId(), request.targetUrl());

            auditActivities.persistReport(auditActivities.buildSignedReport(request.jobId(), request.targetUrl(), result));
            auditActivities.markVerified(request.jobId());
            auditActivities.appendEvent(streamEvent(
                    request.jobId(),
                    "complete",
                    AuditStatus.COMPLETE,
                    "Your site review is complete. Results are ready.",
                    100
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

    private void handleFailure(String jobId, Exception exception) {
        String internalMessage = rootMessage(exception);
        String userMessage = toUserMessage(exception, internalMessage);
        try {
            auditActivities.markFailed(jobId, userMessage);
            auditActivities.appendEvent(streamEvent(
                    jobId,
                    "error",
                    AuditStatus.FAILED,
                    userMessage,
                    null
            ));
        } catch (Exception ignored) {
            Workflow.getLogger(AuditWorkflowImpl.class)
                    .error("Unable to persist audit failure for {}. Root cause: {}", jobId, internalMessage, ignored);
        }
    }

    private AuditStreamEventSchema streamEvent(
            String jobId,
            String eventType,
            AuditStatus status,
            String message,
            Integer progress
    ) {
        AuditStreamEventSchema event = new AuditStreamEventSchema();
        event.setJobId(jobId);
        event.setType(AuditStreamEventSchema.Type.fromValue(eventType));
        event.setStatus(AuditStreamEventSchema.Status.fromValue(status.name()));
        event.setMessage(message);
        event.setProgress(progress);
        return event;
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
