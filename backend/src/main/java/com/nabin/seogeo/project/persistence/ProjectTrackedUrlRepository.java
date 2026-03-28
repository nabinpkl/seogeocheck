package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectTrackedUrlRepository extends JpaRepository<ProjectTrackedUrlEntity, UUID> {

    List<ProjectTrackedUrlEntity> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    List<ProjectTrackedUrlEntity> findByProjectIdIn(Collection<UUID> projectIds);

    Optional<ProjectTrackedUrlEntity> findByProjectIdAndNormalizedUrl(UUID projectId, String normalizedUrl);
}
