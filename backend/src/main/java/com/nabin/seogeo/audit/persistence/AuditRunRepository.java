package com.nabin.seogeo.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRunRepository extends JpaRepository<AuditRunEntity, String> {
}
