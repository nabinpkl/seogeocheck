package com.nabin.seogeo.mcp;

import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/mcp")
public class McpController {

    private final McpPrincipalResolver mcpPrincipalResolver;

    public McpController(McpPrincipalResolver mcpPrincipalResolver) {
        this.mcpPrincipalResolver = mcpPrincipalResolver;
    }

    @GetMapping
    public Map<String, Object> describe(Authentication authentication) {
        AuthenticatedUser user = mcpPrincipalResolver.requireUser(authentication);
        return response(user, "GET");
    }

    @PostMapping
    public Map<String, Object> handle(Authentication authentication, @RequestBody(required = false) Object body) {
        AuthenticatedUser user = mcpPrincipalResolver.requireUser(authentication);
        Map<String, Object> response = new LinkedHashMap<>(response(user, "POST"));
        response.put("receivedPayload", body);
        return response;
    }

    private static Map<String, Object> response(AuthenticatedUser user, String method) {
        return Map.<String, Object>of(
                "status", "ready",
                "transport", "streamable-http",
                "receivedMethod", method,
                "user", Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "accountKind", user.getAccountKind().name(),
                        "emailVerified", user.isEmailVerified()
                ),
                "timestamp", OffsetDateTime.now().toString()
        );
    }
}
