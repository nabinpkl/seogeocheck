package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthSessionService {

    private static final String CURRENT_USER_ID_SESSION_KEY = "seogeo.auth.currentUserId";
    private static final String PENDING_VERIFICATION_USER_ID_SESSION_KEY = "seogeo.auth.pendingVerificationUserId";
    private static final String MERGE_INTENT_ID_SESSION_KEY = "seogeo.auth.mergeIntentId";

    private final AuthUserRepository authUserRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy;

    public AuthSessionService(
            AuthUserRepository authUserRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            SecurityContextRepository securityContextRepository,
            SecurityContextHolderStrategy securityContextHolderStrategy
    ) {
        this.authUserRepository = authUserRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
        this.securityContextHolderStrategy = securityContextHolderStrategy;
    }

    public void rememberPendingVerificationUser(HttpServletRequest request, UUID userId) {
        request.getSession(true).setAttribute(PENDING_VERIFICATION_USER_ID_SESSION_KEY, userId.toString());
    }

    public AuthenticatedUser authenticateUser(
            AuthUserEntity user,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        AuthenticatedUser authenticatedUser = toAuthenticatedUser(user);
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                authenticatedUser,
                null,
                AuthorityUtils.createAuthorityList("ROLE_USER")
        );
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        request.getSession(true).setAttribute(CURRENT_USER_ID_SESSION_KEY, user.getId().toString());
        return authenticatedUser;
    }

    public boolean tryAutoAuthenticateVerifiedUser(
            AuthUserEntity user,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return false;
        }

        Object pendingUserId = session.getAttribute(PENDING_VERIFICATION_USER_ID_SESSION_KEY);
        if (!(pendingUserId instanceof String pendingUserIdString)) {
            return false;
        }

        if (!user.getId().toString().equals(pendingUserIdString)) {
            return false;
        }

        authenticateUser(user, request, response);
        session.removeAttribute(PENDING_VERIFICATION_USER_ID_SESSION_KEY);
        return true;
    }

    public void clearPendingVerificationUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(PENDING_VERIFICATION_USER_ID_SESSION_KEY);
        }
    }

    public AuthenticatedUser resolveCurrentUserFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Object currentUserId = session.getAttribute(CURRENT_USER_ID_SESSION_KEY);
        if (!(currentUserId instanceof String currentUserIdValue)) {
            return null;
        }
        try {
            return authUserRepository.findById(UUID.fromString(currentUserIdValue))
                    .map(this::toAuthenticatedUser)
                    .orElse(null);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    public void rememberMergeIntent(HttpServletRequest request, UUID mergeIntentId) {
        request.getSession(true).setAttribute(MERGE_INTENT_ID_SESSION_KEY, mergeIntentId.toString());
    }

    public UUID resolveMergeIntentId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Object mergeIntentId = session.getAttribute(MERGE_INTENT_ID_SESSION_KEY);
        if (!(mergeIntentId instanceof String mergeIntentIdValue)) {
            return null;
        }
        try {
            return UUID.fromString(mergeIntentIdValue);
        } catch (IllegalArgumentException ignored) {
            session.removeAttribute(MERGE_INTENT_ID_SESSION_KEY);
            return null;
        }
    }

    public void clearMergeIntent(HttpServletRequest request) {
        if (request == null) {
            return;
        }
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(MERGE_INTENT_ID_SESSION_KEY);
        }
    }

    private AuthenticatedUser toAuthenticatedUser(AuthUserEntity user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getEmailOriginal(),
                user.getAccountKind(),
                user.getEmailVerifiedAt() != null,
                user.getCreatedAt()
        );
    }
}
