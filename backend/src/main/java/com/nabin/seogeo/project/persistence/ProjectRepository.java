package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    List<ProjectEntity> findByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId);

    Optional<ProjectEntity> findByOwnerUserIdAndSlug(UUID ownerUserId, String slug);

    boolean existsByOwnerUserIdAndSlug(UUID ownerUserId, String slug);
}
