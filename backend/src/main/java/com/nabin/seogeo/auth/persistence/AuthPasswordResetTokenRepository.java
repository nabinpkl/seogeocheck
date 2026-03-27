package com.nabin.seogeo.auth.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthPasswordResetTokenRepository extends JpaRepository<AuthPasswordResetTokenEntity, UUID> {

    Optional<AuthPasswordResetTokenEntity> findByTokenHash(String tokenHash);

    Optional<AuthPasswordResetTokenEntity> findFirstByUserIdAndUsedAtIsNullAndSupersededAtIsNullAndExpiresAtAfterOrderBySentAtDesc(
            UUID userId,
            OffsetDateTime expiresAfter
    );

    List<AuthPasswordResetTokenEntity> findByUserIdAndUsedAtIsNullAndSupersededAtIsNull(UUID userId);

    long countByUserIdAndSentAtAfter(UUID userId, OffsetDateTime sentAfter);

    @Modifying
    @Query("""
            update AuthPasswordResetTokenEntity token
            set token.usedAt = :usedAt
            where token.id = :tokenId
              and token.usedAt is null
              and token.supersededAt is null
              and token.expiresAt > :usedAt
            """)
    int markUsedIfActive(@Param("tokenId") UUID tokenId, @Param("usedAt") OffsetDateTime usedAt);
}
