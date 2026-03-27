package com.nabin.seogeo.auth.domain;

import java.io.Serial;
import java.io.Serializable;
import java.security.Principal;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class AuthenticatedUser implements Serializable, Principal {

    @Serial
    private static final long serialVersionUID = 1L;

    private final UUID id;
    private final String email;
    private final boolean emailVerified;
    private final OffsetDateTime createdAt;

    public AuthenticatedUser(UUID id, String email, boolean emailVerified, OffsetDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.emailVerified = emailVerified;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getName() {
        return email;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
