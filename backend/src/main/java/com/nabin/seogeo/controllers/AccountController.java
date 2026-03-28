package com.nabin.seogeo.controllers;

import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.service.AuthService;
import com.nabin.seogeo.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/account")
public class AccountController {

    private final ProjectService projectService;
    private final AuthService authService;

    public AccountController(
            ProjectService projectService,
            AuthService authService
    ) {
        this.projectService = projectService;
        this.authService = authService;
    }

    @GetMapping("/audits")
    public List<AccountAuditSummaryResponse> listAudits(
            Authentication authentication,
            @RequestParam(name = "projectSlug", required = false) String projectSlug
    ) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return projectService.listOwnedAudits(user.getId(), projectSlug).stream()
                .map(AccountAuditSummaryResponse::from)
                .toList();
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
