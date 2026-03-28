package com.nabin.seogeo.project.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_project_links")
public class AuditProjectLinkEntity {

    @Id
    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "tracked_url_id", nullable = false)
    private UUID trackedUrlId;

    @Column(name = "linked_at", nullable = false)
    private OffsetDateTime linkedAt;

    @Column(name = "linked_by_user_id", nullable = false)
    private UUID linkedByUserId;

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getTrackedUrlId() {
        return trackedUrlId;
    }

    public void setTrackedUrlId(UUID trackedUrlId) {
        this.trackedUrlId = trackedUrlId;
    }

    public OffsetDateTime getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(OffsetDateTime linkedAt) {
        this.linkedAt = linkedAt;
    }

    public UUID getLinkedByUserId() {
        return linkedByUserId;
    }

    public void setLinkedByUserId(UUID linkedByUserId) {
        this.linkedByUserId = linkedByUserId;
    }
}
