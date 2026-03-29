package com.nabin.seogeo.auth.persistence;

import com.nabin.seogeo.auth.domain.AuthAccountKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_users")
public class AuthUserEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_kind", nullable = false, length = 32)
    private AuthAccountKind accountKind;

    @Column(name = "email_normalized", length = 320, unique = true)
    private String emailNormalized;

    @Column(name = "email_original", length = 320)
    private String emailOriginal;

    @Column(name = "password_hash", columnDefinition = "text")
    private String passwordHash;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "email_verified_at")
    private OffsetDateTime emailVerifiedAt;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Column(name = "failed_login_window_started_at")
    private OffsetDateTime failedLoginWindowStartedAt;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void ensureAccountKind() {
        if (accountKind != null) {
            return;
        }
        if (emailNormalized == null || emailNormalized.isBlank()) {
            accountKind = AuthAccountKind.ANONYMOUS;
            return;
        }
        accountKind = enabled && emailVerifiedAt != null
                ? AuthAccountKind.EMAIL_VERIFIED
                : AuthAccountKind.EMAIL_UNVERIFIED;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public AuthAccountKind getAccountKind() {
        return accountKind;
    }

    public void setAccountKind(AuthAccountKind accountKind) {
        this.accountKind = accountKind;
    }

    public String getEmailNormalized() {
        return emailNormalized;
    }

    public void setEmailNormalized(String emailNormalized) {
        this.emailNormalized = emailNormalized;
    }

    public String getEmailOriginal() {
        return emailOriginal;
    }

    public void setEmailOriginal(String emailOriginal) {
        this.emailOriginal = emailOriginal;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public OffsetDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(OffsetDateTime emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public int getFailedLoginCount() {
        return failedLoginCount;
    }

    public void setFailedLoginCount(int failedLoginCount) {
        this.failedLoginCount = failedLoginCount;
    }

    public OffsetDateTime getFailedLoginWindowStartedAt() {
        return failedLoginWindowStartedAt;
    }

    public void setFailedLoginWindowStartedAt(OffsetDateTime failedLoginWindowStartedAt) {
        this.failedLoginWindowStartedAt = failedLoginWindowStartedAt;
    }

    public OffsetDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(OffsetDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
