package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuditProjectLinkRepository extends JpaRepository<AuditProjectLinkEntity, String> {

    List<AuditProjectLinkEntity> findByProjectIdOrderByLinkedAtDesc(UUID projectId);

    List<AuditProjectLinkEntity> findByProjectIdIn(Collection<UUID> projectIds);

    List<AuditProjectLinkEntity> findByTrackedUrlIdOrderByLinkedAtDesc(UUID trackedUrlId);

    List<AuditProjectLinkEntity> findByTrackedUrlIdIn(Collection<UUID> trackedUrlIds);

    Optional<AuditProjectLinkEntity> findByJobId(String jobId);
}
