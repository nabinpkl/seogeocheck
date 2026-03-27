package com.nabin.seogeo.auth.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface AuthUserRepository extends JpaRepository<AuthUserEntity, UUID> {

    Optional<AuthUserEntity> findByEmailNormalized(String emailNormalized);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from AuthUserEntity user where user.emailNormalized = :emailNormalized")
    Optional<AuthUserEntity> findByEmailNormalizedForUpdate(@Param("emailNormalized") String emailNormalized);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from AuthUserEntity user where user.id = :id")
    Optional<AuthUserEntity> findByIdForUpdate(@Param("id") UUID id);
}
