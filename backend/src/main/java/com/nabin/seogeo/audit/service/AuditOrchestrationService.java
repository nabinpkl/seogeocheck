package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.config.AuditProperties;
import com.nabin.seogeo.audit.config.SeoSignalsProperties;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowOptions;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.nabin.seogeo.temporal.audit.AuditWorkflow;
import com.nabin.seogeo.temporal.audit.AuditWorkflowRequest;

@Service
public class AuditOrchestrationService {

    private final AuditPersistenceService auditPersistenceService;
    private final WorkflowClient workflowClient;
    private final AuditProperties auditProperties;
    private final SeoSignalsProperties seoSignalsProperties;

    public AuditOrchestrationService(
            AuditPersistenceService auditPersistenceService,
            WorkflowClient workflowClient,
            AuditProperties auditProperties,
            SeoSignalsProperties seoSignalsProperties
    ) {
        this.auditPersistenceService = auditPersistenceService;
        this.workflowClient = workflowClient;
        this.auditProperties = auditProperties;
        this.seoSignalsProperties = seoSignalsProperties;
    }

    public void startAudit(String jobId, String targetUrl, OffsetDateTime createdAt, UUID ownerUserId) {
        auditPersistenceService.createPendingRun(jobId, targetUrl, createdAt, ownerUserId);

        AuditWorkflow workflow = workflowClient.newWorkflowStub(
                AuditWorkflow.class,
                WorkflowOptions.newBuilder()
                        .setTaskQueue(auditProperties.getTaskQueue())
                        .setWorkflowId(jobId)
                        .build()
        );

        try {
            WorkflowClient.start(
                    workflow::runAudit,
                    new AuditWorkflowRequest(
                            jobId,
                            targetUrl,
                            createdAt,
                            seoSignalsProperties.getTaskQueue(),
                            seoSignalsProperties.getActivityTimeout().toSeconds()
                    )
            );
        } catch (RuntimeException exception) {
            auditPersistenceService.deletePendingRun(jobId);
            throw exception;
        }
    }
}
