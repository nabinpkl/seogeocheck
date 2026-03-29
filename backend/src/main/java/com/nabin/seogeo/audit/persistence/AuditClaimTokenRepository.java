package com.nabin.seogeo.audit.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuditClaimTokenRepository extends JpaRepository<AuditClaimTokenEntity, UUID> {

    Optional<AuditClaimTokenEntity> findByTokenHash(String tokenHash);

    @Modifying
    @Query("delete from AuditClaimTokenEntity token where token.reservedUserId = :reservedUserId")
    int deleteByReservedUserId(@Param("reservedUserId") UUID reservedUserId);

    @Modifying
    @Query("delete from AuditClaimTokenEntity token where token.jobId in :jobIds")
    int deleteByJobIdIn(@Param("jobIds") Collection<String> jobIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from AuditClaimTokenEntity token where token.id = :id")
    Optional<AuditClaimTokenEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select token
            from AuditClaimTokenEntity token
            where token.reservedUserId = :reservedUserId
              and token.consumedAt is null
              and token.expiresAt > :now
            order by token.createdAt asc
            """)
    List<AuditClaimTokenEntity> findActiveReservedTokens(
            @Param("reservedUserId") UUID reservedUserId,
            @Param("now") OffsetDateTime now
    );
}
