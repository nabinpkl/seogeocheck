package com.nabin.seogeo.controllers;

import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.service.AuthService;
import com.nabin.seogeo.project.domain.ProjectSummary;
import com.nabin.seogeo.project.domain.ProjectTrackedUrlSummary;
import com.nabin.seogeo.project.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/account/projects")
public class AccountProjectController {

    private final ProjectService projectService;
    private final AuthService authService;

    public AccountProjectController(ProjectService projectService, AuthService authService) {
        this.projectService = projectService;
        this.authService = authService;
    }

    @GetMapping
    public List<ProjectSummaryResponse> listProjects(Authentication authentication) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return projectService.listProjects(user.getId()).stream()
                .map(ProjectSummaryResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ProjectSummaryResponse> createProject(
            Authentication authentication,
            @Valid @RequestBody ProjectMutationRequest request
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        ProjectSummary summary = projectService.createProject(
                user.getId(),
                request.name(),
                request.description()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ProjectSummaryResponse.from(summary));
    }

    @GetMapping("/{slug}")
    public ProjectSummaryResponse getProject(
            Authentication authentication,
            @PathVariable String slug
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return projectService.findProject(user.getId(), slug)
                .map(ProjectSummaryResponse::from)
                .orElseThrow(() -> new ProjectService.ProjectNotFoundException(slug));
    }

    @PatchMapping("/{slug}")
    public ProjectSummaryResponse updateProject(
            Authentication authentication,
            @PathVariable String slug,
            @Valid @RequestBody ProjectMutationRequest request
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return ProjectSummaryResponse.from(projectService.updateProject(
                user.getId(),
                slug,
                request.name(),
                request.description()
        ));
    }

    @GetMapping("/{slug}/urls")
    public List<ProjectTrackedUrlSummaryResponse> listTrackedUrls(
            Authentication authentication,
            @PathVariable String slug
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return projectService.listTrackedUrls(user.getId(), slug).stream()
                .map(ProjectTrackedUrlSummaryResponse::from)
                .toList();
    }

    @GetMapping("/{slug}/audits")
    public List<AccountAuditSummaryResponse> listProjectAudits(
            Authentication authentication,
            @PathVariable String slug,
            @RequestParam(name = "url", required = false) String trackedUrl
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return projectService.listProjectAudits(user.getId(), slug, trackedUrl).stream()
                .map(AccountAuditSummaryResponse::from)
                .toList();
    }

    @PostMapping("/{slug}/audits/{jobId}")
    public AccountAuditSummaryResponse attachAudit(
            Authentication authentication,
            @PathVariable String slug,
            @PathVariable String jobId
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return AccountAuditSummaryResponse.from(projectService.attachAuditToProject(user.getId(), slug, jobId));
    }

    @DeleteMapping("/{slug}/audits/{jobId}")
    public ResponseEntity<Void> detachAudit(
            Authentication authentication,
            @PathVariable String slug,
            @PathVariable String jobId
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        projectService.detachAuditFromProject(user.getId(), slug, jobId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ProjectService.ProjectNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProjectNotFound(ProjectService.ProjectNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "PROJECT_NOT_FOUND",
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(ProjectService.AuditDeletionNotAllowedException.class)
    public ResponseEntity<Map<String, Object>> handleAuditDeletionNotAllowed(
            ProjectService.AuditDeletionNotAllowedException exception
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "AUDIT_DELETE_NOT_ALLOWED",
                "message", exception.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_PROJECT_REQUEST",
                "message", exception.getMessage()
        ));
    }

    public record ProjectMutationRequest(
            @NotBlank String name,
            String description
    ) {
    }

    public record ProjectSummaryResponse(
            String id,
            String slug,
            boolean isDefault,
            String name,
            String description,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            int trackedUrlCount,
            int verifiedUrlCount,
            int auditCount,
            int activeAuditCount,
            OffsetDateTime latestAuditAt,
            Integer projectScore,
            ScoreTrendResponse scoreTrend,
            int criticalIssueCount,
            int affectedUrlCount,
            List<TopIssueResponse> topIssues
    ) {
        static ProjectSummaryResponse from(ProjectSummary summary) {
            return new ProjectSummaryResponse(
                    summary.id().toString(),
                    summary.slug(),
                    summary.isDefault(),
                    summary.name(),
                    summary.description(),
                    summary.createdAt(),
                    summary.updatedAt(),
                    summary.trackedUrlCount(),
                    summary.verifiedUrlCount(),
                    summary.auditCount(),
                    summary.activeAuditCount(),
                    summary.latestAuditAt(),
                    summary.projectScore(),
                    ScoreTrendResponse.from(summary.scoreTrend()),
                    summary.criticalIssueCount(),
                    summary.affectedUrlCount(),
                    summary.topIssues().stream().map(TopIssueResponse::from).toList()
            );
        }
    }

    public record ScoreTrendResponse(
            int improvedUrlCount,
            int declinedUrlCount,
            int flatUrlCount,
            int netScoreDelta
    ) {
        static ScoreTrendResponse from(ProjectSummary.ScoreTrend scoreTrend) {
            if (scoreTrend == null) {
                return null;
            }
            return new ScoreTrendResponse(
                    scoreTrend.improvedUrlCount(),
                    scoreTrend.declinedUrlCount(),
                    scoreTrend.flatUrlCount(),
                    scoreTrend.netScoreDelta()
            );
        }
    }

    public record TopIssueResponse(
            String key,
            String label,
            String severity,
            int affectedUrlCount,
            String exampleInstruction
    ) {
        static TopIssueResponse from(ProjectSummary.ProjectTopIssue issue) {
            return new TopIssueResponse(
                    issue.key(),
                    issue.label(),
                    issue.severity(),
                    issue.affectedUrlCount(),
                    issue.exampleInstruction()
            );
        }
    }

    public record ProjectTrackedUrlSummaryResponse(
            String id,
            String trackedUrl,
            String normalizedUrl,
            String normalizedHost,
            String normalizedPath,
            int auditCount,
            OffsetDateTime latestAuditAt,
            String latestAuditStatus,
            OffsetDateTime latestVerifiedAt,
            Integer currentScore,
            int currentCriticalIssueCount
    ) {
        static ProjectTrackedUrlSummaryResponse from(ProjectTrackedUrlSummary summary) {
            return new ProjectTrackedUrlSummaryResponse(
                    summary.id().toString(),
                    summary.trackedUrl(),
                    summary.normalizedUrl(),
                    summary.normalizedHost(),
                    summary.normalizedPath(),
                    summary.auditCount(),
                    summary.latestAuditAt(),
                    summary.latestAuditStatus(),
                    summary.latestVerifiedAt(),
                    summary.currentScore(),
                    summary.currentCriticalIssueCount()
            );
        }
    }

    public record AccountAuditSummaryResponse(
            String jobId,
            String targetUrl,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime completedAt,
            Integer score,
            String projectSlug,
            String projectName,
            String trackedUrl
    ) {
        static AccountAuditSummaryResponse from(AccountAuditSummary summary) {
            return new AccountAuditSummaryResponse(
                    summary.jobId(),
                    summary.targetUrl(),
                    summary.status().name(),
                    summary.createdAt(),
                    summary.completedAt(),
                    summary.score(),
                    summary.projectSlug(),
                    summary.projectName(),
                    summary.trackedUrl()
            );
        }
    }
}
