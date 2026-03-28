package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AuditRunSummaryHighIssueRepository extends JpaRepository<AuditRunSummaryHighIssueEntity, Long> {

    void deleteByJobId(String jobId);

    List<AuditRunSummaryHighIssueEntity> findByJobIdIn(Collection<String> jobIds);
}
