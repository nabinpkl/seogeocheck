package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRunSummaryRepository extends JpaRepository<AuditRunSummaryEntity, String> {
}
