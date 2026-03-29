package com.nabin.seogeo.auth.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface AuthUserMergeIntentRepository extends JpaRepository<AuthUserMergeIntentEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select intent from AuthUserMergeIntentEntity intent where intent.id = :id")
    Optional<AuthUserMergeIntentEntity> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query("delete from AuthUserMergeIntentEntity intent where intent.sourceUserId = :userId or intent.targetUserId = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("delete from AuthUserMergeIntentEntity intent where intent.expiresAt <= :now or intent.consumedAt is not null")
    int deleteExpiredOrConsumed(@Param("now") OffsetDateTime now);
}
