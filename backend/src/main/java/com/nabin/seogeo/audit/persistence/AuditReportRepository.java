package com.nabin.seogeo.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface AuditReportRepository extends JpaRepository<AuditReportEntity, String> {

    @Modifying
    @Query("delete from AuditReportEntity report where report.jobId in :jobIds")
    int deleteByJobIdIn(@Param("jobIds") Collection<String> jobIds);
}
