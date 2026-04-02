package com.nabin.seogeo.mcp;

import com.nabin.seogeo.audit.service.OwnedAuditService;
import com.nabin.seogeo.auth.AbstractOAuthMcpIntegrationTest;
import com.nabin.seogeo.auth.AuthIntegrationTestConfiguration;
import com.nabin.seogeo.project.domain.ProjectSummary;
import com.nabin.seogeo.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class McpIntegrationTests extends AbstractOAuthMcpIntegrationTest {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private OwnedAuditService ownedAuditService;

    @Test
    void initializeResourceDiscoveryAndToolsListExposeTheSelfDescribingMcpSurface() throws Exception {
        String sessionCookie = verifyAndLogin("mcp-init@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "mcp-init-state", "mcp-init-verifier"));

        Map<String, Object> resourcesResponse = mcpRequest(mcpSession, "resources-list-1", "resources/list", Map.of());
        List<Map<String, Object>> resources = castListOfMaps(castMap(resourcesResponse.get("result")).get("resources"));
        assertThat(resources).hasSize(1);
        assertThat(resources.getFirst())
                .containsEntry("uri", "seogeo://guide/overview")
                .containsEntry("mimeType", "text/markdown");

        Map<String, Object> overviewResponse = mcpRequest(
                mcpSession,
                "resources-read-1",
                "resources/read",
                Map.of("uri", "seogeo://guide/overview")
        );
        List<Map<String, Object>> contents = castListOfMaps(castMap(overviewResponse.get("result")).get("contents"));
        assertThat(contents).hasSize(1);
        assertThat(String.valueOf(contents.getFirst().get("text")))
                .contains("SEOGEO MCP")
                .contains("projects_list")
                .contains("audit_start")
                .contains("audit_report_get")
                .contains("default project");

        Map<String, Object> response = mcpRequest(mcpSession, "tools-list-1", "tools/list", Map.of());
        List<Map<String, Object>> tools = castListOfMaps(castMap(response.get("result")).get("tools"));
        assertThat(tools).extracting(tool -> String.valueOf(tool.get("name")))
                .containsExactlyInAnyOrder(
                        "projects_list",
                        "project_get",
                        "project_audits_list",
                        "audit_start",
                        "audit_report_get"
                );

        Map<String, Object> projectsListTool = findTool(tools, "projects_list");
        assertThat(String.valueOf(projectsListTool.get("description"))).contains("Start here");
        assertThat(castMap(projectsListTool.get("outputSchema"))).containsEntry("type", "array");

        Map<String, Object> auditStartTool = findTool(tools, "audit_start");
        Map<String, Object> auditStartProperties = castMap(castMap(castMap(auditStartTool.get("inputSchema")).get("properties")).get("url"));
        assertThat(String.valueOf(auditStartProperties.get("description"))).contains("Bare domains are accepted");
        assertThat(auditStartProperties).containsEntry("format", "uri-reference");

        Map<String, Object> auditReportTool = findTool(tools, "audit_report_get");
        Map<String, Object> auditReportOutput = castMap(auditReportTool.get("outputSchema"));
        assertThat(castListOfMaps(auditReportOutput.get("oneOf"))).hasSize(2);
    }

    @Test
    void mcpRejectsMissingInvalidJwtClaimsAndAudience() {
        restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .body(initializeRequest("init-auth"))
                .exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().value(HttpHeaders.WWW_AUTHENTICATE, value -> assertThat(value).contains("Bearer"));

        expectUnauthorizedMcpInitialization(mintAccessToken(Map.of(
                "scope", REQUESTED_SCOPE,
                "email_verified", true,
                "account_kind", "EMAIL_VERIFIED"
        )));
        expectUnauthorizedMcpInitialization(mintAccessToken(Map.of(
                "aud", "https://wrong.example/mcp",
                "scope", REQUESTED_SCOPE,
                "email_verified", true,
                "account_kind", "EMAIL_VERIFIED"
        )));
        expectUnauthorizedMcpInitialization(mintAccessToken(Map.of(
                "aud", oAuthProperties.getMcpResourceUri(),
                "scope", REQUESTED_SCOPE,
                "email_verified", false,
                "account_kind", "EMAIL_VERIFIED"
        )));
        expectUnauthorizedMcpInitialization(mintAccessToken(Map.of(
                "aud", oAuthProperties.getMcpResourceUri(),
                "scope", REQUESTED_SCOPE,
                "email_verified", true,
                "account_kind", "ANONYMOUS"
        )));
    }

    @Test
    void projectsListAndProjectGetRespectOwnership() throws Exception {
        String ownerCookie = verifyAndLogin("mcp-projects-owner@example.com", "CorrectHorseBattery1!");
        verifyAndLogin("mcp-projects-other@example.com", "CorrectHorseBattery1!");
        McpClientSession ownerMcp = initializeMcpSession(authorizeAccessToken(ownerCookie, "mcp-projects-owner-state", "mcp-projects-owner-verifier"));

        ProjectSummary ownerProject = createProject("mcp-projects-owner@example.com", "Owner Project", "owner only");
        ProjectSummary otherProject = createProject("mcp-projects-other@example.com", "Other Project", "other only");

        Map<String, Object> projectsList = callTool(ownerMcp, "projects_list", Map.of(), "projects-list");
        List<Map<String, Object>> structuredProjects = castListOfMaps(projectsList.get("structuredContent"));
        assertThat(structuredProjects).extracting(project -> String.valueOf(project.get("slug")))
                .contains(ownerProject.slug())
                .doesNotContain(otherProject.slug());

        Map<String, Object> projectGet = callTool(ownerMcp, "project_get", Map.of("slug", ownerProject.slug()), "project-get-owner");
        assertThat(projectGet.get("isError")).isEqualTo(false);
        assertThat(castMap(projectGet.get("structuredContent"))).containsEntry("slug", ownerProject.slug());

        Map<String, Object> notFound = callTool(ownerMcp, "project_get", Map.of("slug", otherProject.slug()), "project-get-other");
        assertThat(notFound.get("isError")).isEqualTo(true);
        assertThat(castMap(notFound.get("structuredContent"))).containsEntry("error", "NOT_FOUND");
    }

    @Test
    void projectAuditsListSupportsTrackedUrlFiltering() throws Exception {
        String sessionCookie = verifyAndLogin("mcp-project-audits@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "mcp-project-audits-state", "mcp-project-audits-verifier"));
        UUID ownerUserId = userIdForEmail("mcp-project-audits@example.com");

        ProjectSummary project = projectService.createProject(ownerUserId, "MCP Project", "tracked-url filter");
        String firstJobId = ownedAuditService.startOwnedAudit(ownerUserId, "example.com", project.slug()).jobId();
        String secondJobId = ownedAuditService.startOwnedAudit(ownerUserId, "example.org", project.slug()).jobId();

        Map<String, Object> toolResult = callTool(
                mcpSession,
                "project_audits_list",
                Map.of("projectSlug", project.slug(), "trackedUrl", "https://example.com"),
                "project-audits-filtered"
        );

        List<Map<String, Object>> audits = castListOfMaps(toolResult.get("structuredContent"));
        assertThat(audits).extracting(audit -> String.valueOf(audit.get("jobId")))
                .contains(firstJobId)
                .doesNotContain(secondJobId);

        awaitAuditStatus(mcpSession, firstJobId, "VERIFIED", Duration.ofSeconds(8));
        awaitAuditStatus(mcpSession, secondJobId, "VERIFIED", Duration.ofSeconds(8));
    }

    @Test
    void auditStartUsesTheDefaultProjectWhenProjectSlugIsOmitted() throws Exception {
        String sessionCookie = verifyAndLogin("mcp-default-project@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "mcp-default-project-state", "mcp-default-project-verifier"));
        UUID ownerUserId = userIdForEmail("mcp-default-project@example.com");
        String defaultProjectSlug = projectService.ensureDefaultProject(ownerUserId).slug();

        Map<String, Object> startResult = callTool(
                mcpSession,
                "audit_start",
                Map.of("url", "example.com"),
                "audit-start-default-project"
        );

        Map<String, Object> startPayload = castMap(startResult.get("structuredContent"));
        assertThat(startResult.get("isError")).isEqualTo(false);
        assertThat(startPayload).containsEntry("status", "QUEUED");
        assertThat(startPayload).containsEntry("projectSlug", defaultProjectSlug);
        awaitAuditStatus(mcpSession, String.valueOf(startPayload.get("jobId")), "VERIFIED", Duration.ofSeconds(8));
    }

    @Test
    void auditStartAndAuditReportToolsReturnPendingVerifiedAndFailedStates() throws Exception {
        String sessionCookie = verifyAndLogin("mcp-audit-tools@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "mcp-audit-tools-state", "mcp-audit-tools-verifier"));
        UUID ownerUserId = userIdForEmail("mcp-audit-tools@example.com");
        ProjectSummary project = projectService.createProject(ownerUserId, "MCP Audits", "tool-owned audits");

        Map<String, Object> startResult = callTool(
                mcpSession,
                "audit_start",
                Map.of("url", "example.com", "projectSlug", project.slug()),
                "audit-start-success"
        );
        Map<String, Object> startPayload = castMap(startResult.get("structuredContent"));
        String successJobId = String.valueOf(startPayload.get("jobId"));

        Map<String, Object> pendingResult = callTool(
                mcpSession,
                "audit_report_get",
                Map.of("jobId", successJobId),
                "audit-report-pending"
        );
        Map<String, Object> pendingPayload = castMap(pendingResult.get("structuredContent"));
        assertThat(pendingResult.get("isError")).isEqualTo(false);
        assertThat(String.valueOf(pendingPayload.get("status"))).isIn("QUEUED", "STREAMING", "COMPLETE", "VERIFIED");
        if (!"VERIFIED".equals(String.valueOf(pendingPayload.get("status")))) {
            assertThat(pendingPayload).containsEntry("message", "Your final report is still being prepared.");
        }

        Map<String, Object> verifiedPayload = awaitAuditStatus(mcpSession, successJobId, "VERIFIED", Duration.ofSeconds(8));
        assertThat(verifiedPayload).containsEntry("jobId", successJobId);
        assertThat(verifiedPayload.get("report")).isInstanceOf(Map.class);

        Map<String, Object> failingStartResult = callTool(
                mcpSession,
                "audit_start",
                Map.of("url", "https://fail.example.com", "projectSlug", project.slug()),
                "audit-start-failure"
        );
        String failingJobId = String.valueOf(castMap(failingStartResult.get("structuredContent")).get("jobId"));

        Map<String, Object> failedPayload = awaitAuditStatus(mcpSession, failingJobId, "FAILED", Duration.ofSeconds(8));
        assertThat(failedPayload).containsEntry("jobId", failingJobId);
        assertThat(failedPayload).containsEntry("status", "FAILED");
        assertThat(failedPayload.get("message")).isInstanceOf(String.class);
    }

    @Test
    void toolsReturnStructuredValidationErrorsForBadArguments() throws Exception {
        String sessionCookie = verifyAndLogin("mcp-validation@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "mcp-validation-state", "mcp-validation-verifier"));

        Map<String, Object> response = mcpRequest(
                mcpSession,
                "project-get-invalid",
                "tools/call",
                Map.of(
                        "name", "project_get",
                        "arguments", Map.of("slug", "", "unexpected", "value")
                )
        );

        Map<String, Object> error = castMap(response.get("error"));
        assertThat(error).containsEntry("code", -32602);
        assertThat(String.valueOf(error.get("message"))).contains("Unexpected argument");
        assertThat(castMap(error.get("data"))).containsEntry("argument", "unexpected");
    }

    private ProjectSummary createProject(String email, String name, String description) {
        return projectService.createProject(userIdForEmail(email), name, description);
    }

    private UUID userIdForEmail(String email) {
        return authUserRepository.findByEmailNormalized(email.toLowerCase())
                .map(user -> user.getId())
                .orElseThrow();
    }

    private Map<String, Object> findTool(List<Map<String, Object>> tools, String name) {
        return tools.stream()
                .filter(tool -> name.equals(String.valueOf(tool.get("name"))))
                .findFirst()
                .orElseThrow();
    }
}
