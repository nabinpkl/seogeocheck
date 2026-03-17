package com.nabin.seogeo.temporal.audit;

import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;

@WorkflowInterface
public interface AuditWorkflow {

    @WorkflowMethod
    void runAudit(AuditWorkflowRequest request);
}
