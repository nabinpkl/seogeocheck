package com.nabin.seogeo.mcp;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class McpAuthenticationContext {

    public static final String AUTHENTICATION_CONTEXT_KEY = "springAuthentication";

    private final McpPrincipalResolver mcpPrincipalResolver;

    public McpAuthenticationContext(McpPrincipalResolver mcpPrincipalResolver) {
        this.mcpPrincipalResolver = mcpPrincipalResolver;
    }

    public AuthenticatedUser requireCurrentUser() {
        return mcpPrincipalResolver.requireUser(SecurityContextHolder.getContext().getAuthentication());
    }

    public AuthenticatedUser requireCurrentUser(McpSyncServerExchange exchange) {
        Object authentication = exchange.transportContext().get(AUTHENTICATION_CONTEXT_KEY);
        if (authentication instanceof Authentication springAuthentication) {
            return mcpPrincipalResolver.requireUser(springAuthentication);
        }
        return requireCurrentUser();
    }
}
