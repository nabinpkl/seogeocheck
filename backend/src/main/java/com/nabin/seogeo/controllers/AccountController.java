package com.nabin.seogeo.controllers;

import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.audit.service.AuditPersistenceService;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.service.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/account")
public class AccountController {

    private final AuditPersistenceService auditPersistenceService;
    private final AuthService authService;

    public AccountController(
            AuditPersistenceService auditPersistenceService,
            AuthService authService
    ) {
        this.auditPersistenceService = auditPersistenceService;
        this.authService = authService;
    }

    @GetMapping("/audits")
    public List<AccountAuditSummaryResponse> listAudits(Authentication authentication) {
        AuthenticatedUser user = authService.requireAuthenticatedUser(authentication.getPrincipal());
        return auditPersistenceService.listOwnedAudits(user.getId()).stream()
                .map(AccountAuditSummaryResponse::from)
                .toList();
    }

    public record AccountAuditSummaryResponse(
            String jobId,
            String targetUrl,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime completedAt,
            Integer score
    ) {
        static AccountAuditSummaryResponse from(AccountAuditSummary summary) {
            return new AccountAuditSummaryResponse(
                    summary.jobId(),
                    summary.targetUrl(),
                    summary.status().name(),
                    summary.createdAt(),
                    summary.completedAt(),
                    summary.score()
            );
        }
    }
}
