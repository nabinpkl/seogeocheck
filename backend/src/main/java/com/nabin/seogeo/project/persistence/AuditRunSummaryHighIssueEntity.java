package com.nabin.seogeo.project.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_run_summary_high_issues")
public class AuditRunSummaryHighIssueEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "issue_key", nullable = false, length = 191)
    private String issueKey;

    @Column(name = "issue_label", nullable = false, length = 255)
    private String issueLabel;

    @Column(name = "issue_instruction", columnDefinition = "text")
    private String issueInstruction;

    @Column(name = "severity", nullable = false, length = 32)
    private String severity;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getIssueKey() {
        return issueKey;
    }

    public void setIssueKey(String issueKey) {
        this.issueKey = issueKey;
    }

    public String getIssueLabel() {
        return issueLabel;
    }

    public void setIssueLabel(String issueLabel) {
        this.issueLabel = issueLabel;
    }

    public String getIssueInstruction() {
        return issueInstruction;
    }

    public void setIssueInstruction(String issueInstruction) {
        this.issueInstruction = issueInstruction;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }
}
