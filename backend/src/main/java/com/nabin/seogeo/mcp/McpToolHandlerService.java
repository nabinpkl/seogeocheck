package com.nabin.seogeo.mcp;

import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.audit.service.OwnedAuditService;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.project.domain.ProjectSummary;
import com.nabin.seogeo.project.service.ProjectService;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class McpToolHandlerService {

    private static final Logger log = LoggerFactory.getLogger(McpToolHandlerService.class);

    private final McpAuthenticationContext mcpAuthenticationContext;
    private final ProjectService projectService;
    private final OwnedAuditService ownedAuditService;

    public McpToolHandlerService(
            McpAuthenticationContext mcpAuthenticationContext,
            ProjectService projectService,
            OwnedAuditService ownedAuditService
    ) {
        this.mcpAuthenticationContext = mcpAuthenticationContext;
        this.projectService = projectService;
        this.ownedAuditService = ownedAuditService;
    }

    public McpSchema.CallToolResult projectsList(McpSyncServerExchange exchange, McpSchema.CallToolRequest request) {
        Map<String, Object> arguments = argumentsOrEmpty(request);
        validateAllowedArguments(arguments, Set.of());
        AuthenticatedUser user = currentUser(exchange);
        List<Map<String, Object>> response = projectService.listProjects(user.getId()).stream()
                .map(this::toProjectSummary)
                .toList();
        return success(response);
    }

    public McpSchema.CallToolResult projectGet(McpSyncServerExchange exchange, McpSchema.CallToolRequest request) {
        Map<String, Object> arguments = argumentsOrEmpty(request);
        validateAllowedArguments(arguments, Set.of("slug"));
        String slug = requiredString(arguments, "slug");
        AuthenticatedUser user = currentUser(exchange);
        try {
            ProjectSummary project = projectService.findProject(user.getId(), slug)
                    .orElseThrow(() -> new ProjectService.ProjectNotFoundException(slug));
            return success(toProjectSummary(project));
        } catch (ProjectService.ProjectNotFoundException exception) {
            return notFound(exception.getMessage());
        }
    }

    public McpSchema.CallToolResult projectAuditsList(McpSyncServerExchange exchange, McpSchema.CallToolRequest request) {
        Map<String, Object> arguments = argumentsOrEmpty(request);
        validateAllowedArguments(arguments, Set.of("projectSlug", "trackedUrl"));
        String projectSlug = requiredString(arguments, "projectSlug");
        String trackedUrl = optionalString(arguments, "trackedUrl");
        AuthenticatedUser user = currentUser(exchange);
        try {
            List<Map<String, Object>> response = projectService.listProjectAudits(user.getId(), projectSlug, trackedUrl).stream()
                    .map(this::toAuditSummary)
                    .toList();
            return success(response);
        } catch (ProjectService.ProjectNotFoundException exception) {
            return notFound(exception.getMessage());
        }
    }

    public McpSchema.CallToolResult auditStart(McpSyncServerExchange exchange, McpSchema.CallToolRequest request) {
        Map<String, Object> arguments = argumentsOrEmpty(request);
        validateAllowedArguments(arguments, Set.of("url", "projectSlug"));
        String url = requiredString(arguments, "url");
        String projectSlug = optionalString(arguments, "projectSlug");
        AuthenticatedUser user = currentUser(exchange);
        try {
            OwnedAuditService.OwnedAuditStartResult result = ownedAuditService.startOwnedAudit(user.getId(), url, projectSlug);
            return success(Map.of(
                    "jobId", result.jobId(),
                    "status", result.status().name(),
                    "projectSlug", result.projectSlug()
            ));
        } catch (ProjectService.ProjectNotFoundException exception) {
            return notFound(exception.getMessage());
        } catch (IllegalArgumentException exception) {
            throw invalidParams("url", "Argument 'url' must be a valid website URL.");
        } catch (RuntimeException exception) {
            log.error("Unexpected failure starting owned MCP audit for user {}", user.getId(), exception);
            throw exception;
        }
    }

    public McpSchema.CallToolResult auditReportGet(McpSyncServerExchange exchange, McpSchema.CallToolRequest request) {
        Map<String, Object> arguments = argumentsOrEmpty(request);
        validateAllowedArguments(arguments, Set.of("jobId"));
        String jobId = requiredString(arguments, "jobId");
        AuthenticatedUser user = currentUser(exchange);
        try {
            OwnedAuditService.OwnedAuditReportResult result = ownedAuditService.getOwnedAuditReport(user.getId(), jobId);
            if (result.report() != null) {
                return success(Map.of(
                        "jobId", result.jobId(),
                        "status", result.status().name(),
                        "report", result.report()
                ));
            }
            return success(withMessage(result.jobId(), result.status().name(), result.message()));
        } catch (OwnedAuditService.AuditNotFoundException exception) {
            return notFound(exception.getReason());
        } catch (RuntimeException exception) {
            log.error("Unexpected failure reading MCP audit report for job {}", jobId, exception);
            throw exception;
        }
    }

    private AuthenticatedUser currentUser(McpSyncServerExchange exchange) {
        return mcpAuthenticationContext.requireCurrentUser(exchange);
    }

    private Map<String, Object> argumentsOrEmpty(McpSchema.CallToolRequest request) {
        return request.arguments() == null ? Map.of() : request.arguments();
    }

    private void validateAllowedArguments(Map<String, Object> arguments, Set<String> allowedArguments) {
        for (String argument : arguments.keySet()) {
            if (!allowedArguments.contains(argument)) {
                throw invalidParams(argument, "Unexpected argument '" + argument + "'.");
            }
        }
    }

    private String requiredString(Map<String, Object> arguments, String argument) {
        Object value = arguments.get(argument);
        if (!(value instanceof String stringValue) || stringValue.trim().isEmpty()) {
            throw invalidParams(argument, "Argument '" + argument + "' is required.");
        }
        return stringValue.trim();
    }

    private String optionalString(Map<String, Object> arguments, String argument) {
        Object value = arguments.get(argument);
        if (value == null) {
            return null;
        }
        if (!(value instanceof String stringValue)) {
            throw invalidParams(argument, "Argument '" + argument + "' must be a string.");
        }
        String trimmedValue = stringValue.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private McpError invalidParams(String argument, String message) {
        return McpError.builder(McpSchema.ErrorCodes.INVALID_PARAMS)
                .message(message)
                .data(Map.of("argument", argument))
                .build();
    }

    private McpSchema.CallToolResult success(Object body) {
        return McpSchema.CallToolResult.builder()
                .content(List.of())
                .structuredContent(body)
                .isError(false)
                .build();
    }

    private McpSchema.CallToolResult notFound(String message) {
        return McpSchema.CallToolResult.builder()
                .content(List.of())
                .structuredContent(Map.of(
                        "error", "NOT_FOUND",
                        "message", message
                ))
                .isError(true)
                .build();
    }

    private Map<String, Object> toProjectSummary(ProjectSummary summary) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", summary.id().toString());
        response.put("slug", summary.slug());
        response.put("isDefault", summary.isDefault());
        response.put("name", summary.name());
        response.put("description", summary.description());
        response.put("createdAt", summary.createdAt());
        response.put("updatedAt", summary.updatedAt());
        response.put("trackedUrlCount", summary.trackedUrlCount());
        response.put("verifiedUrlCount", summary.verifiedUrlCount());
        response.put("auditCount", summary.auditCount());
        response.put("activeAuditCount", summary.activeAuditCount());
        response.put("latestAuditAt", summary.latestAuditAt());
        response.put("projectScore", summary.projectScore());
        response.put("scoreTrend", summary.scoreTrend() == null ? null : Map.of(
                "improvedUrlCount", summary.scoreTrend().improvedUrlCount(),
                "declinedUrlCount", summary.scoreTrend().declinedUrlCount(),
                "flatUrlCount", summary.scoreTrend().flatUrlCount(),
                "netScoreDelta", summary.scoreTrend().netScoreDelta()
        ));
        response.put("criticalIssueCount", summary.criticalIssueCount());
        response.put("affectedUrlCount", summary.affectedUrlCount());
        response.put("topIssues", summary.topIssues().stream().map(issue -> Map.of(
                "key", issue.key(),
                "label", issue.label(),
                "severity", issue.severity(),
                "affectedUrlCount", issue.affectedUrlCount(),
                "exampleInstruction", issue.exampleInstruction()
        )).toList());
        return response;
    }

    private Map<String, Object> toAuditSummary(AccountAuditSummary summary) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jobId", summary.jobId());
        response.put("targetUrl", summary.targetUrl());
        response.put("status", summary.status().name());
        response.put("createdAt", summary.createdAt());
        response.put("completedAt", summary.completedAt());
        response.put("score", summary.score());
        response.put("projectSlug", summary.projectSlug());
        response.put("projectName", summary.projectName());
        response.put("trackedUrl", summary.trackedUrl());
        return response;
    }

    private Map<String, Object> withMessage(String jobId, String status, String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jobId", jobId);
        response.put("status", status);
        response.put("message", message);
        return response;
    }
}
