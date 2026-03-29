package com.nabin.seogeo.project.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    List<ProjectEntity> findByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId);

    Optional<ProjectEntity> findByOwnerUserIdAndSlug(UUID ownerUserId, String slug);

    boolean existsByOwnerUserIdAndSlug(UUID ownerUserId, String slug);

    @Modifying
    @Query("delete from ProjectEntity project where project.ownerUserId = :ownerUserId")
    int deleteByOwnerUserId(@Param("ownerUserId") UUID ownerUserId);
}
