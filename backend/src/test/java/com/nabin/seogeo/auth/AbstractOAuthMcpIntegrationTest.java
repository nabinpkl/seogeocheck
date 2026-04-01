package com.nabin.seogeo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.auth.config.OAuthProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
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

public abstract class AbstractOAuthMcpIntegrationTest extends AbstractAuthIntegrationTest {

    protected static final String CLIENT_ID = "claude-code-test";
    protected static final String REDIRECT_URI = "https://claude.ai/oauth/callback";
    protected static final String REQUESTED_SCOPE = "seogeo:mcp";
    protected static final String MCP_ACCEPT = "application/json, text/event-stream";
    protected static final String MCP_SESSION_ID_HEADER = "mcp-session-id";

    @Autowired
    protected JwtEncoder jwtEncoder;

    @Autowired
    protected OAuthProperties oAuthProperties;

    @Autowired
    protected ObjectMapper objectMapper;

    protected String verifyAndLogin(String email, String password) {
        register(email, password);
        verifyLatestEmailToken();
        return loginAndExtractSessionCookie(email, password);
    }

    protected AuthorizationCodeGrant startAuthorizationGrant(String sessionCookie, String state, String codeVerifier) {
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

    protected String approveConsent(String sessionCookie, String consentState, String expectedState) {
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

    protected Map<String, Object> exchangeAuthorizationCode(String code, String codeVerifier) {
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

    protected String authorizeAccessToken(String sessionCookie, String state, String codeVerifier) {
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, state, codeVerifier);
        String code = approveConsent(sessionCookie, grant.consentState(), state);
        return String.valueOf(exchangeAuthorizationCode(code, codeVerifier).get("access_token"));
    }

    protected McpClientSession initializeMcpSession(String accessToken) throws Exception {
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

    protected Map<String, Object> mcpRequest(
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

    protected Map<String, Object> callTool(
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

    protected Map<String, Object> awaitAuditStatus(
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

    protected void expectUnauthorizedMcpInitialization(String accessToken) {
        restTestClient.post()
                .uri("/mcp")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.ACCEPT, MCP_ACCEPT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .body(initializeRequest("init-auth-failure"))
                .exchange()
                .expectStatus().isUnauthorized();
    }

    protected Map<String, Object> initializeRequest(String id) {
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

    protected String mintAccessToken(Map<String, Object> claims) {
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

    protected Map<String, Object> readJson(String json) throws Exception {
        return objectMapper.readValue(json, Map.class);
    }

    protected Map<String, Object> parseSseJsonRpcResponse(String body) throws Exception {
        String data = body.lines()
                .filter(line -> line.startsWith("data: "))
                .map(line -> line.substring("data: ".length()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No SSE data line found in response: " + body));
        return readJson(data);
    }

    protected String buildAuthorizeUri(String codeChallenge, String challengeMethod, String state) {
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

    protected static MultiValueMap<String, String> form(Map<String, String> entries) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        entries.forEach(form::add);
        return form;
    }

    protected static String codeChallenge(String verifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to compute PKCE challenge", exception);
        }
    }

    @SuppressWarnings("unchecked")
    protected Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    protected List<Map<String, Object>> castListOfMaps(Object value) {
        return (List<Map<String, Object>>) value;
    }

    protected record AuthorizationCodeGrant(String consentUri, String consentState) {
    }

    protected record McpClientSession(String accessToken, String sessionId) {
    }
}
