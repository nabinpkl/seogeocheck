package com.nabin.seogeo.mcp;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.domain.AuthAccountKind;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class McpPrincipalResolver {

    private final AuthUserRepository authUserRepository;

    public McpPrincipalResolver(AuthUserRepository authUserRepository) {
        this.authUserRepository = authUserRepository;
    }

    public AuthenticatedUser requireUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new AccessDeniedException("Missing MCP principal.");
        }

        String subject = jwt.getSubject();
        AuthUserEntity user = authUserRepository.findById(UUID.fromString(subject))
                .orElseThrow(() -> new AccessDeniedException("OAuth subject is no longer available."));

        if (user.getEmailVerifiedAt() == null || user.getAccountKind() == AuthAccountKind.ANONYMOUS) {
            throw new AccessDeniedException("OAuth principal is not eligible for MCP access.");
        }

        return new AuthenticatedUser(
                user.getId(),
                user.getEmailOriginal(),
                user.getAccountKind(),
                true,
                user.getCreatedAt()
        );
    }
}
