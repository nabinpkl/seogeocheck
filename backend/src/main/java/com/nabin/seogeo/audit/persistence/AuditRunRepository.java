package com.nabin.seogeo.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuditRunRepository extends JpaRepository<AuditRunEntity, String> {

    List<AuditRunEntity> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId);

    List<AuditRunEntity> findByJobIdIn(List<String> jobIds);

    @Query("select run.jobId from AuditRunEntity run where run.ownerUserId = :ownerUserId")
    List<String> findJobIdsByOwnerUserId(@Param("ownerUserId") UUID ownerUserId);

    @Modifying
    @Query("delete from AuditRunEntity run where run.ownerUserId = :ownerUserId")
    int deleteByOwnerUserId(@Param("ownerUserId") UUID ownerUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select run from AuditRunEntity run where run.jobId = :jobId")
    Optional<AuditRunEntity> findByIdForUpdate(@Param("jobId") String jobId);
}
