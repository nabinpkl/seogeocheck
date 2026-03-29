package com.nabin.seogeo.auth.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthEmailVerificationTokenRepository extends JpaRepository<AuthEmailVerificationTokenEntity, UUID> {

    Optional<AuthEmailVerificationTokenEntity> findByTokenHash(String tokenHash);

    Optional<AuthEmailVerificationTokenEntity> findFirstByUserIdAndUsedAtIsNullAndSupersededAtIsNullAndExpiresAtAfterOrderBySentAtDesc(
            UUID userId,
            OffsetDateTime expiresAfter
    );

    List<AuthEmailVerificationTokenEntity> findByUserIdAndUsedAtIsNullAndSupersededAtIsNull(UUID userId);

    long countByUserIdAndSentAtAfter(UUID userId, OffsetDateTime sentAfter);

    @Modifying
    @Query("delete from AuthEmailVerificationTokenEntity token where token.userId = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("""
            update AuthEmailVerificationTokenEntity token
            set token.usedAt = :usedAt
            where token.id = :tokenId
              and token.usedAt is null
              and token.supersededAt is null
              and token.expiresAt > :usedAt
            """)
    int markUsedIfActive(@Param("tokenId") UUID tokenId, @Param("usedAt") OffsetDateTime usedAt);
}
