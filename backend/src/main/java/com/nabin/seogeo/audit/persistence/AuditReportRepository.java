package com.nabin.seogeo.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditReportRepository extends JpaRepository<AuditReportEntity, String> {
}
