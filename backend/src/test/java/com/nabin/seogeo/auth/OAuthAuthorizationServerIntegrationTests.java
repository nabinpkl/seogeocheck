package com.nabin.seogeo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.auth.config.OAuthProperties;
import com.nabin.seogeo.audit.service.OwnedAuditService;
import com.nabin.seogeo.project.domain.ProjectSummary;
import com.nabin.seogeo.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class OAuthAuthorizationServerIntegrationTests extends AbstractAuthIntegrationTest {

    private static final String CLIENT_ID = "claude-code-test";
    private static final String REDIRECT_URI = "https://claude.ai/oauth/callback";
    private static final String REQUESTED_SCOPE = "seogeo:mcp";
    private static final String MCP_ACCEPT = "application/json, text/event-stream";
    private static final String MCP_SESSION_ID_HEADER = "mcp-session-id";

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private OAuthProperties oAuthProperties;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private OwnedAuditService ownedAuditService;

    @Test
    void authorizeWithoutSessionRedirectsToFrontendSignInWithOriginalAuthorizeUrl() {
        String authorizeUri = buildAuthorizeUri(codeChallenge("oauth-verifier"), "S256", "browser-state");

        var result = restTestClient.get()
                .uri(authorizeUri)
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).startsWith("http://localhost:3000/sign-in");
        URI redirected = URI.create(location);
        String next = UriComponentsBuilder.fromUri(redirected).build().getQueryParams().getFirst("next");
        assertThat(next).isNotNull();
        next = URLDecoder.decode(next, StandardCharsets.UTF_8);
        assertThat(next).contains("/oauth2/authorize");
        assertThat(next).contains("client_id=" + CLIENT_ID);
    }

    @Test
    void anonymousSessionCannotAuthorizeAndIsRedirectedToSignIn() {
        String sessionCookie = createGuestAndExtractSessionCookie();
        String authorizeUri = buildAuthorizeUri(codeChallenge("oauth-verifier"), "S256", "guest-state");

        var result = restTestClient.get()
                .uri(authorizeUri)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).startsWith("http://localhost:3000/sign-in");
        String next = UriComponentsBuilder.fromUri(URI.create(location)).build().getQueryParams().getFirst("next");
        assertThat(next).isNotNull();
        assertThat(URLDecoder.decode(next, StandardCharsets.UTF_8)).contains("/oauth2/authorize");
    }

    @Test
    void verifiedUserCanApproveConsentExchangeCodeInitializeMcpAndListTools() throws Exception {
        String sessionCookie = verifyAndLogin("owner@example.com", "CorrectHorseBattery1!");
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "browser-state", "oauth-verifier");

        restTestClient.get()
                .uri(grant.consentUri())
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class)
                .value(body -> {
                    assertThat(body).contains("Authorize Claude Code Test");
                    assertThat(body).contains(REQUESTED_SCOPE);
                });

        String code = approveConsent(sessionCookie, grant.consentState(), "browser-state");
        Map<String, Object> tokenBody = exchangeAuthorizationCode(code, "oauth-verifier");
        assertThat(tokenBody.get("access_token")).isInstanceOf(String.class);
        assertThat(tokenBody.get("refresh_token")).isInstanceOf(String.class);
        assertThat(tokenBody).containsEntry("scope", REQUESTED_SCOPE);

        McpClientSession mcpSession = initializeMcpSession(String.valueOf(tokenBody.get("access_token")));
        Map<String, Object> response = mcpRequest(mcpSession, "tools-list-1", "tools/list", Map.of());
        Map<String, Object> result = castMap(response.get("result"));
        List<Map<String, Object>> tools = castListOfMaps(result.get("tools"));

        assertThat(tools).extracting(tool -> String.valueOf(tool.get("name")))
                .containsExactlyInAnyOrder(
                        "projects_list",
                        "project_get",
                        "project_audits_list",
                        "audit_start",
                        "audit_report_get"
                );
    }

    @Test
    void consentDenialRedirectsWithAccessDenied() {
        String sessionCookie = verifyAndLogin("deny@example.com", "CorrectHorseBattery1!");
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "deny-state", "oauth-verifier");

        var result = restTestClient.post()
                .uri("/oauth2/authorize")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .body(form(Map.of(
                        "client_id", CLIENT_ID,
                        "state", grant.consentState()
                )))
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).startsWith(REDIRECT_URI);
        assertThat(location).contains("error=access_denied");
        assertThat(location).contains("state=deny-state");
    }

    @Test
    void tokenExchangeRejectsMissingWrongAndReusedVerifiers() {
        String missingVerifierSession = verifyAndLogin("token-missing@example.com", "CorrectHorseBattery1!");

        String missingVerifierCode = approveConsent(
                missingVerifierSession,
                startAuthorizationGrant(missingVerifierSession, "missing-state", "oauth-verifier-1").consentState(),
                "missing-state"
        );
        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "authorization_code",
                        "client_id", CLIENT_ID,
                        "code", missingVerifierCode,
                        "redirect_uri", REDIRECT_URI
                )))
                .exchange()
                .expectStatus().isUnauthorized();

        String wrongVerifierSession = verifyAndLogin("token-wrong@example.com", "CorrectHorseBattery1!");
        String wrongVerifierCode = approveConsent(
                wrongVerifierSession,
                startAuthorizationGrant(wrongVerifierSession, "wrong-state", "oauth-verifier-2").consentState(),
                "wrong-state"
        );
        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "authorization_code",
                        "client_id", CLIENT_ID,
                        "code", wrongVerifierCode,
                        "redirect_uri", REDIRECT_URI,
                        "code_verifier", "definitely-wrong"
                )))
                .exchange()
                .expectStatus().isBadRequest();

        String reusedCodeSession = verifyAndLogin("token-reuse@example.com", "CorrectHorseBattery1!");
        String reusedCode = approveConsent(
                reusedCodeSession,
                startAuthorizationGrant(reusedCodeSession, "reuse-state", "oauth-verifier-3").consentState(),
                "reuse-state"
        );
        exchangeAuthorizationCode(reusedCode, "oauth-verifier-3");
        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "authorization_code",
                        "client_id", CLIENT_ID,
                        "code", reusedCode,
                        "redirect_uri", REDIRECT_URI,
                        "code_verifier", "oauth-verifier-3"
                )))
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    void refreshTokenRotationInvalidatesThePreviousRefreshToken() {
        String sessionCookie = verifyAndLogin("refresh@example.com", "CorrectHorseBattery1!");
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "refresh-state", "oauth-verifier");
        String code = approveConsent(sessionCookie, grant.consentState(), "refresh-state");
        Map<String, Object> tokenBody = exchangeAuthorizationCode(code, "oauth-verifier");

        String originalRefreshToken = String.valueOf(tokenBody.get("refresh_token"));
        var refreshResult = restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "refresh_token",
                        "client_id", CLIENT_ID,
                        "refresh_token", originalRefreshToken
                )))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        String rotatedRefreshToken = String.valueOf(refreshResult.getResponseBody().get("refresh_token"));
        assertThat(rotatedRefreshToken).isNotEqualTo(originalRefreshToken);

        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "refresh_token",
                        "client_id", CLIENT_ID,
                        "refresh_token", originalRefreshToken
                )))
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    void authorizationServerMetadataAdvertisesPublicClientAuthForTokenAndRevocationEndpoints() {
        restTestClient.get()
                .uri("/.well-known/oauth-authorization-server")
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat((List<String>) body.get("token_endpoint_auth_methods_supported")).containsExactly("none");
                    assertThat((List<String>) body.get("grant_types_supported"))
                            .containsExactly("authorization_code", "refresh_token");
                    assertThat((List<String>) body.get("revocation_endpoint_auth_methods_supported")).containsExactly("none");
                });
    }

    @Test
    void publicClientCanRevokeRefreshTokens() {
        String sessionCookie = verifyAndLogin("revoke@example.com", "CorrectHorseBattery1!");
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "revoke-state", "oauth-verifier");
        String code = approveConsent(sessionCookie, grant.consentState(), "revoke-state");
        Map<String, Object> tokenBody = exchangeAuthorizationCode(code, "oauth-verifier");

        String refreshToken = String.valueOf(tokenBody.get("refresh_token"));
        restTestClient.post()
                .uri("/oauth2/revoke")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "client_id", CLIENT_ID,
                        "token", refreshToken,
                        "token_type_hint", "refresh_token"
                )))
                .exchange()
                .expectStatus().isOk();

        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "refresh_token",
                        "client_id", CLIENT_ID,
                        "refresh_token", refreshToken
                )))
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    void protectedResourceMetadataIsPublicAndAdvertisesTheMcpScope() {
        restTestClient.get()
                .uri("/.well-known/oauth-protected-resource/mcp")
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body.get("resource")).isEqualTo(oAuthProperties.getMcpResourceUri());
                    assertThat((List<String>) body.get("authorization_servers")).contains(oAuthProperties.getIssuer());
                    assertThat((List<String>) body.get("scopes_supported")).contains(REQUESTED_SCOPE);
                });
    }

    @Test
    void mcpRejectsMissingInvalidJwtClaimsAndAudience() {
        Map<String, Object> initializeRequest = initializeRequest("init-auth");

        restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .body(initializeRequest)
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
        String ownerCookie = verifyAndLogin("projects-owner@example.com", "CorrectHorseBattery1!");
        String otherCookie = verifyAndLogin("projects-other@example.com", "CorrectHorseBattery1!");
        McpClientSession ownerMcp = initializeMcpSession(authorizeAccessToken(ownerCookie, "projects-owner-state", "projects-owner-verifier"));

        ProjectSummary ownerProject = createProject("projects-owner@example.com", "Owner Project", "owner only");
        ProjectSummary otherProject = createProject("projects-other@example.com", "Other Project", "other only");

        Map<String, Object> projectsList = callTool(ownerMcp, "projects_list", Map.of(), "projects-list");
        assertThat(projectsList)
                .withFailMessage("Expected structured MCP result for projects_list but got: %s", projectsList)
                .containsKey("structuredContent");
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
    void projectAuditsListReturnsOnlyProjectAudits() throws Exception {
        String sessionCookie = verifyAndLogin("project-audits@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "project-audits-state", "project-audits-verifier"));
        UUID ownerUserId = userIdForEmail("project-audits@example.com");

        ProjectSummary alphaProject = projectService.createProject(ownerUserId, "Alpha", "alpha project");
        ProjectSummary betaProject = projectService.createProject(ownerUserId, "Beta", "beta project");

        String alphaJobId = ownedAuditService.startOwnedAudit(ownerUserId, "example.com", alphaProject.slug()).jobId();
        String betaJobId = ownedAuditService.startOwnedAudit(ownerUserId, "example.org", betaProject.slug()).jobId();

        Map<String, Object> toolResult = callTool(
                mcpSession,
                "project_audits_list",
                Map.of("projectSlug", alphaProject.slug()),
                "project-audits-list"
        );
        assertThat(toolResult)
                .withFailMessage("Expected structured MCP result for project_audits_list but got: %s", toolResult)
                .containsKey("structuredContent");

        List<Map<String, Object>> audits = castListOfMaps(toolResult.get("structuredContent"));
        assertThat(audits).extracting(audit -> String.valueOf(audit.get("jobId")))
                .contains(alphaJobId)
                .doesNotContain(betaJobId);
    }

    @Test
    void auditStartAndAuditReportToolsReturnPendingVerifiedAndFailedStates() throws Exception {
        String sessionCookie = verifyAndLogin("audit-tools@example.com", "CorrectHorseBattery1!");
        McpClientSession mcpSession = initializeMcpSession(authorizeAccessToken(sessionCookie, "audit-tools-state", "audit-tools-verifier"));
        UUID ownerUserId = userIdForEmail("audit-tools@example.com");
        ProjectSummary project = projectService.createProject(ownerUserId, "MCP Audits", "tool-owned audits");

        Map<String, Object> startResult = callTool(
                mcpSession,
                "audit_start",
                Map.of("url", "example.com", "projectSlug", project.slug()),
                "audit-start-success"
        );
        Map<String, Object> startPayload = castMap(startResult.get("structuredContent"));
        assertThat(startResult.get("isError")).isEqualTo(false);
        assertThat(startPayload).containsEntry("status", "QUEUED");
        assertThat(startPayload).containsEntry("projectSlug", project.slug());
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
                "audit-start-fail"
        );
        String failingJobId = String.valueOf(castMap(failingStartResult.get("structuredContent")).get("jobId"));

        Map<String, Object> failedPayload = awaitAuditStatus(mcpSession, failingJobId, "FAILED", Duration.ofSeconds(8));
        assertThat(failedPayload).containsEntry("jobId", failingJobId);
        assertThat(failedPayload.get("message")).isInstanceOf(String.class);
    }

    @Test
    void deletingAccountRemovesOauthAuthorizationsAndConsents() {
        String sessionCookie = verifyAndLogin("delete@example.com", "CorrectHorseBattery1!");
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "delete-state", "oauth-verifier");
        String code = approveConsent(sessionCookie, grant.consentState(), "delete-state");
        exchangeAuthorizationCode(code, "oauth-verifier");

        assertThat(jdbcTemplate.queryForObject("select count(*) from oauth2_authorization", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select count(*) from oauth2_authorization_consent", Integer.class)).isEqualTo(1);

        deleteAccount(sessionCookie);

        assertThat(jdbcTemplate.queryForObject("select count(*) from oauth2_authorization", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from oauth2_authorization_consent", Integer.class)).isZero();
    }

    private String verifyAndLogin(String email, String password) {
        register(email, password);
        verifyLatestEmailToken();
        return loginAndExtractSessionCookie(email, password);
    }

    private AuthorizationCodeGrant startAuthorizationGrant(String sessionCookie, String state, String codeVerifier) {
        String authorizeUri = buildAuthorizeUri(codeChallenge(codeVerifier), "S256", state);
        var result = restTestClient.get()
                .uri(authorizeUri)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).contains("/oauth2/consent");
        URI consentUri = URI.create(location);
        return new AuthorizationCodeGrant(
                consentUri.toString(),
                URLDecoder.decode(
                        UriComponentsBuilder.fromUri(consentUri).build().getQueryParams().getFirst("state"),
                        StandardCharsets.UTF_8
                )
        );
    }

    private String approveConsent(String sessionCookie, String consentState, String expectedState) {
        var result = restTestClient.post()
                .uri("/oauth2/authorize")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .body(form(Map.of(
                        "client_id", CLIENT_ID,
                        "state", consentState,
                        "scope", REQUESTED_SCOPE
                )))
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).startsWith(REDIRECT_URI);
        assertThat(location).contains("state=" + expectedState);
        return UriComponentsBuilder.fromUriString(location).build().getQueryParams().getFirst("code");
    }

    private Map<String, Object> exchangeAuthorizationCode(String code, String codeVerifier) {
        var result = restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "authorization_code",
                        "client_id", CLIENT_ID,
                        "code", code,
                        "redirect_uri", REDIRECT_URI,
                        "code_verifier", codeVerifier
                )))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);
        assertThat(result.getResponseBody()).isNotNull();
        return result.getResponseBody();
    }

    private String authorizeAccessToken(String sessionCookie, String state, String codeVerifier) {
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, state, codeVerifier);
        String code = approveConsent(sessionCookie, grant.consentState(), state);
        return String.valueOf(exchangeAuthorizationCode(code, codeVerifier).get("access_token"));
    }

    private McpClientSession initializeMcpSession(String accessToken) throws Exception {
        var result = restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .body(initializeRequest("init-" + UUID.randomUUID()))
                .exchange()
                .expectStatus().isOk()
                .returnResult(String.class);

        String sessionId = result.getResponseHeaders().getFirst(MCP_SESSION_ID_HEADER);
        assertThat(sessionId).isNotBlank();
        Map<String, Object> body = readJson(result.getResponseBody());
        Map<String, Object> initializeResult = castMap(body.get("result"));
        assertThat(initializeResult).containsKey("serverInfo");
        assertThat(initializeResult).containsKey("capabilities");

        restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header(MCP_SESSION_ID_HEADER, sessionId)
                .body(Map.of(
                        "jsonrpc", "2.0",
                        "method", "notifications/initialized",
                        "params", Map.of()
                ))
                .exchange()
                .expectStatus().isAccepted();

        return new McpClientSession(accessToken, sessionId);
    }

    private Map<String, Object> mcpRequest(
            McpClientSession session,
            String id,
            String method,
            Map<String, Object> params
    ) throws Exception {
        var result = restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + session.accessToken())
                .header(MCP_SESSION_ID_HEADER, session.sessionId())
                .body(Map.of(
                        "jsonrpc", "2.0",
                        "id", id,
                        "method", method,
                        "params", params
                ))
                .exchange()
                .expectStatus().isOk()
                .returnResult(String.class);

        return parseSseJsonRpcResponse(result.getResponseBody());
    }

    private Map<String, Object> callTool(
            McpClientSession session,
            String toolName,
            Map<String, Object> arguments,
            String requestId
    ) throws Exception {
        Map<String, Object> response = mcpRequest(session, requestId, "tools/call", Map.of(
                "name", toolName,
                "arguments", arguments
        ));
        assertThat(response)
                .withFailMessage("Expected MCP tools/call response to contain a result but got: %s", response)
                .containsKey("result");
        return castMap(response.get("result"));
    }

    private Map<String, Object> awaitAuditStatus(
            McpClientSession session,
            String jobId,
            String expectedStatus,
            Duration timeout
    ) throws Exception {
        Instant deadline = Instant.now().plus(timeout);
        while (Instant.now().isBefore(deadline)) {
            Map<String, Object> toolResult = callTool(session, "audit_report_get", Map.of("jobId", jobId), "poll-" + UUID.randomUUID());
            Map<String, Object> structuredContent = castMap(toolResult.get("structuredContent"));
            if (expectedStatus.equals(String.valueOf(structuredContent.get("status")))) {
                return structuredContent;
            }
            Thread.sleep(250);
        }
        throw new AssertionError("Timed out waiting for audit " + jobId + " to reach " + expectedStatus);
    }

    private void expectUnauthorizedMcpInitialization(String accessToken) {
        restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .body(initializeRequest("init-auth-failure"))
                .exchange()
                .expectStatus().isUnauthorized();
    }

    private Map<String, Object> initializeRequest(String id) {
        return Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "method", "initialize",
                "params", Map.of(
                        "protocolVersion", "2025-06-18",
                        "capabilities", Map.of(),
                        "clientInfo", Map.of(
                                "name", "claude-code-test",
                                "version", "1.0.0"
                        )
                )
        );
    }

    private Map<String, Object> parseSseJsonRpcResponse(String body) throws Exception {
        String data = body.lines()
                .filter(line -> line.startsWith("data: "))
                .map(line -> line.substring("data: ".length()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No SSE data line found in response: " + body));
        return readJson(data);
    }

    private Map<String, Object> readJson(String json) throws Exception {
        return objectMapper.readValue(json, Map.class);
    }

    private ProjectSummary createProject(String email, String name, String description) {
        return projectService.createProject(userIdForEmail(email), name, description);
    }

    private UUID userIdForEmail(String email) {
        return authUserRepository.findByEmailNormalized(email.toLowerCase())
                .map(user -> user.getId())
                .orElseThrow();
    }

    private String buildAuthorizeUri(String codeChallenge, String challengeMethod, String state) {
        return UriComponentsBuilder.fromPath("/oauth2/authorize")
                .queryParam("response_type", "code")
                .queryParam("client_id", CLIENT_ID)
                .queryParam("redirect_uri", REDIRECT_URI)
                .queryParam("scope", REQUESTED_SCOPE)
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", challengeMethod)
                .build(true)
                .toUriString();
    }

    private static MultiValueMap<String, String> form(Map<String, String> entries) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        entries.forEach(form::add);
        return form;
    }

    private static String codeChallenge(String verifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to compute PKCE challenge", exception);
        }
    }

    private String mintAccessToken(Map<String, Object> claims) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer(oAuthProperties.getIssuer())
                .subject(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300));

        Map<String, Object> mutableClaims = new LinkedHashMap<>(claims);
        Object audience = mutableClaims.remove("aud");
        if (audience instanceof String value) {
            claimsBuilder.audience(List.of(value));
        } else if (audience instanceof List<?> values) {
            claimsBuilder.audience(values.stream().map(String::valueOf).toList());
        }

        mutableClaims.forEach(claimsBuilder::claim);
        return jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(),
                claimsBuilder.build()
        )).getTokenValue();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castListOfMaps(Object value) {
        return (List<Map<String, Object>>) value;
    }

    private record AuthorizationCodeGrant(String consentUri, String consentState) {
    }

    private record McpClientSession(String accessToken, String sessionId) {
    }
}
