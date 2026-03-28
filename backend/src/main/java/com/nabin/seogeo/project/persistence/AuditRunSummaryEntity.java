package com.nabin.seogeo.project.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_run_summaries")
public class AuditRunSummaryEntity {

    @Id
    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "high_issue_count", nullable = false)
    private Integer highIssueCount;

    @Column(name = "issue_count", nullable = false)
    private Integer issueCount;

    @Column(name = "passed_check_count", nullable = false)
    private Integer passedCheckCount;

    @Column(name = "not_applicable_count", nullable = false)
    private Integer notApplicableCount;

    @Column(name = "system_error_count", nullable = false)
    private Integer systemErrorCount;

    @Column(name = "top_issue_key", length = 191)
    private String topIssueKey;

    @Column(name = "top_issue_label", length = 255)
    private String topIssueLabel;

    @Column(name = "top_issue_instruction", columnDefinition = "text")
    private String topIssueInstruction;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getHighIssueCount() {
        return highIssueCount;
    }

    public void setHighIssueCount(Integer highIssueCount) {
        this.highIssueCount = highIssueCount;
    }

    public Integer getIssueCount() {
        return issueCount;
    }

    public void setIssueCount(Integer issueCount) {
        this.issueCount = issueCount;
    }

    public Integer getPassedCheckCount() {
        return passedCheckCount;
    }

    public void setPassedCheckCount(Integer passedCheckCount) {
        this.passedCheckCount = passedCheckCount;
    }

    public Integer getNotApplicableCount() {
        return notApplicableCount;
    }

    public void setNotApplicableCount(Integer notApplicableCount) {
        this.notApplicableCount = notApplicableCount;
    }

    public Integer getSystemErrorCount() {
        return systemErrorCount;
    }

    public void setSystemErrorCount(Integer systemErrorCount) {
        this.systemErrorCount = systemErrorCount;
    }

    public String getTopIssueKey() {
        return topIssueKey;
    }

    public void setTopIssueKey(String topIssueKey) {
        this.topIssueKey = topIssueKey;
    }

    public String getTopIssueLabel() {
        return topIssueLabel;
    }

    public void setTopIssueLabel(String topIssueLabel) {
        this.topIssueLabel = topIssueLabel;
    }

    public String getTopIssueInstruction() {
        return topIssueInstruction;
    }

    public void setTopIssueInstruction(String topIssueInstruction) {
        this.topIssueInstruction = topIssueInstruction;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(OffsetDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
