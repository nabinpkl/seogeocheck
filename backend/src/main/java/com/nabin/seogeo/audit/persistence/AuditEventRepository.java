package com.nabin.seogeo.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuditEventRepository extends JpaRepository<AuditEventEntity, Long> {

    List<AuditEventEntity> findByJobIdOrderBySequenceAsc(String jobId);

    List<AuditEventEntity> findByJobIdAndSequenceGreaterThanOrderBySequenceAsc(String jobId, long sequence);

    Optional<AuditEventEntity> findBySourceEventId(String sourceEventId);

    @Query("select coalesce(max(event.sequence), 0) from AuditEventEntity event where event.jobId = :jobId")
    long findMaxSequenceByJobId(@Param("jobId") String jobId);
}
