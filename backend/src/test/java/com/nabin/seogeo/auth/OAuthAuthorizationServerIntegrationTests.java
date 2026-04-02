package com.nabin.seogeo.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(AuthIntegrationTestConfiguration.class)
class OAuthAuthorizationServerIntegrationTests extends AbstractOAuthMcpIntegrationTest {

    private static final String LOOPBACK_REDIRECT_URI = "http://127.0.0.1:45111/callback";
    private static final String EXTERNAL_REDIRECT_URI = CLAUDE_CODE_REDIRECT_URI;

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
        assertThat(next).contains("client_id=" + clientId);
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
                        "client_id", clientId,
                        "state", grant.consentState()
                )))
                .exchange()
                .expectStatus().is3xxRedirection()
                .returnResult(String.class);

        String location = result.getResponseHeaders().getFirst(HttpHeaders.LOCATION);
        assertThat(location).startsWith(redirectUri);
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
                        "client_id", clientId,
                        "code", missingVerifierCode,
                        "redirect_uri", redirectUri
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
                        "client_id", clientId,
                        "code", wrongVerifierCode,
                        "redirect_uri", redirectUri,
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
                        "client_id", clientId,
                        "code", reusedCode,
                        "redirect_uri", redirectUri,
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
                        "client_id", clientId,
                        "refresh_token", originalRefreshToken
                )))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        assertThat(refreshResult.getResponseBody()).isNotNull();
        String rotatedRefreshToken = String.valueOf(refreshResult.getResponseBody().get("refresh_token"));
        assertThat(rotatedRefreshToken).isNotEqualTo(originalRefreshToken);

        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "refresh_token",
                        "client_id", clientId,
                        "refresh_token", originalRefreshToken
                )))
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    void authorizationServerMetadataAdvertisesRegistrationAndSupportedClientAuthModes() {
        restTestClient.get()
                .uri("/.well-known/oauth-authorization-server")
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat((List<String>) body.get("token_endpoint_auth_methods_supported"))
                            .containsExactlyInAnyOrder("none", "client_secret_basic");
                    assertThat((List<String>) body.get("grant_types_supported"))
                            .containsExactlyInAnyOrder("authorization_code", "refresh_token", "client_credentials");
                    assertThat((List<String>) body.get("revocation_endpoint_auth_methods_supported"))
                            .containsExactlyInAnyOrder("none", "client_secret_basic");
                    assertThat(body.get("registration_endpoint"))
                            .isEqualTo(oAuthProperties.getIssuer().replaceAll("/$", "") + "/oauth2/register");
                    assertThat((List<String>) body.get("scopes_supported"))
                            .containsExactly(oAuthProperties.getMcpScope());
                });
    }

    @Test
    void openDynamicRegistrationDoesNotRequireASeededRegistrarClient() {
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_registered_client where client_id = ?",
                Integer.class,
                "seogeo-dcr-registrar"
        )).isZero();
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
                        "client_id", clientId,
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
                        "client_id", clientId,
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
    void dynamicClientRegistrationAllowsUnauthenticatedRegistration() {
        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Unauthenticated Client",
                        "redirect_uris", List.of(EXTERNAL_REDIRECT_URI),
                        "grant_types", List.of("authorization_code", "refresh_token"),
                        "response_types", List.of("code"),
                        "token_endpoint_auth_method", "none",
                        "scope", REQUESTED_SCOPE
                ))
                .exchange()
                .expectStatus().isCreated()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body.get("client_id")).isInstanceOf(String.class);
                    assertThat(body.get("token_endpoint_auth_method")).isEqualTo("none");
                });
    }

    @Test
    void dynamicClientRegistrationCreatesDistinctHttpsAndLoopbackClients() {
        Map<String, Object> externalClient = registerPublicMcpClientResponse("Claude Code", EXTERNAL_REDIRECT_URI);
        Map<String, Object> loopbackClient = registerPublicMcpClientResponse("Codex", LOOPBACK_REDIRECT_URI);

        String externalClientId = String.valueOf(externalClient.get("client_id"));
        String loopbackClientId = String.valueOf(loopbackClient.get("client_id"));

        assertThat(externalClientId).startsWith("mcp-");
        assertThat(loopbackClientId).startsWith("mcp-");
        assertThat(externalClientId).isNotEqualTo(loopbackClientId);
        assertThat((List<String>) externalClient.get("redirect_uris")).containsExactly(EXTERNAL_REDIRECT_URI);
        assertThat((List<String>) loopbackClient.get("redirect_uris")).containsExactly(LOOPBACK_REDIRECT_URI);
        assertThat(externalClient.get("token_endpoint_auth_method")).isEqualTo("none");
        assertThat(loopbackClient.get("token_endpoint_auth_method")).isEqualTo("none");

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_registered_client where client_id in (?, ?)",
                Integer.class,
                externalClientId,
                loopbackClientId
        )).isEqualTo(2);
    }

    @Test
    void dynamicClientRegistrationRejectsInvalidRedirectUri() {
        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Invalid Redirect Client",
                        "redirect_uris", List.of("http://example.com/callback"),
                        "grant_types", List.of("authorization_code", "refresh_token"),
                        "response_types", List.of("code"),
                        "token_endpoint_auth_method", "none",
                        "scope", REQUESTED_SCOPE
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body.get("error")).isEqualTo("invalid_redirect_uri");
                    assertThat(String.valueOf(body.get("error_description"))).contains("Redirect URI");
                });
    }

    @Test
    void dynamicClientRegistrationRejectsUnsupportedAuthMethodsGrantTypesResponseTypesAndScopes() {
        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Confidential Client",
                        "redirect_uris", List.of(EXTERNAL_REDIRECT_URI),
                        "grant_types", List.of("authorization_code", "refresh_token"),
                        "response_types", List.of("code"),
                        "token_endpoint_auth_method", "client_secret_basic",
                        "scope", REQUESTED_SCOPE
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body.get("error")).isEqualTo("invalid_client_metadata"));

        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Extra Grant Client",
                        "redirect_uris", List.of(EXTERNAL_REDIRECT_URI),
                        "grant_types", List.of("authorization_code", "refresh_token", "client_credentials"),
                        "response_types", List.of("code"),
                        "token_endpoint_auth_method", "none",
                        "scope", REQUESTED_SCOPE
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body.get("error")).isEqualTo("invalid_client_metadata"));

        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Implicit Client",
                        "redirect_uris", List.of(EXTERNAL_REDIRECT_URI),
                        "grant_types", List.of("authorization_code", "refresh_token"),
                        "response_types", List.of("token"),
                        "token_endpoint_auth_method", "none",
                        "scope", REQUESTED_SCOPE
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body.get("error")).isEqualTo("invalid_client_metadata"));

        restTestClient.post()
                .uri("/oauth2/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "client_name", "Wrong Scope Client",
                        "redirect_uris", List.of(EXTERNAL_REDIRECT_URI),
                        "grant_types", List.of("authorization_code", "refresh_token"),
                        "response_types", List.of("code"),
                        "token_endpoint_auth_method", "none",
                        "scope", "openid profile"
                ))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(Map.class)
                .value(body -> assertThat(body.get("error")).isEqualTo("invalid_client_metadata"));
    }

    @Test
    void concurrentDynamicRegistrationsCreateDistinctClients() {
        List<Object> results = runConcurrently(
                () -> registerPublicMcpClientResponse("Codex A", "http://127.0.0.1:45112/callback"),
                () -> registerPublicMcpClientResponse("Codex B", "http://127.0.0.1:45113/callback")
        );

        List<Map<String, Object>> payloads = results.stream()
                .peek(result -> assertThat(result).isInstanceOf(Map.class))
                .map(result -> (Map<String, Object>) result)
                .toList();

        assertThat(payloads).extracting(payload -> String.valueOf(payload.get("client_id"))).doesNotHaveDuplicates();
    }

    @Test
    void dynamicallyRegisteredClientCanCompleteOauthFlowRefreshAndAccessMcp() throws Exception {
        String dynamicClientId = registerPublicMcpClient("Codex", LOOPBACK_REDIRECT_URI);
        String sessionCookie = verifyAndLogin("codex@example.com", "CorrectHorseBattery1!");

        AuthorizationCodeGrant grant = startAuthorizationGrant(
                sessionCookie,
                dynamicClientId,
                LOOPBACK_REDIRECT_URI,
                "codex-state",
                "codex-verifier"
        );
        String code = approveConsent(
                sessionCookie,
                dynamicClientId,
                grant.consentState(),
                "codex-state",
                LOOPBACK_REDIRECT_URI
        );
        Map<String, Object> tokenBody = exchangeAuthorizationCode(
                dynamicClientId,
                code,
                LOOPBACK_REDIRECT_URI,
                "codex-verifier"
        );

        restTestClient.post()
                .uri("/oauth2/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form(Map.of(
                        "grant_type", "refresh_token",
                        "client_id", dynamicClientId,
                        "refresh_token", String.valueOf(tokenBody.get("refresh_token"))
                )))
                .exchange()
                .expectStatus().isOk();

        McpClientSession mcpSession = initializeMcpSession(String.valueOf(tokenBody.get("access_token")));
        Map<String, Object> toolsList = mcpRequest(mcpSession, "codex-tools", "tools/list", Map.of());
        assertThat(castMap(toolsList.get("result"))).containsKey("tools");
    }

    @Test
    void deletingAccountRemovesOauthAuthorizationsAndConsents() {
        String sessionCookie = verifyAndLogin("delete@example.com", "CorrectHorseBattery1!");
        String principalName = authUserRepository.findByEmailNormalized("delete@example.com")
                .orElseThrow()
                .getId()
                .toString();
        AuthorizationCodeGrant grant = startAuthorizationGrant(sessionCookie, "delete-state", "oauth-verifier");
        String code = approveConsent(sessionCookie, grant.consentState(), "delete-state");
        exchangeAuthorizationCode(code, "oauth-verifier");

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_authorization where principal_name = ?",
                Integer.class,
                principalName
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_authorization_consent where principal_name = ?",
                Integer.class,
                principalName
        )).isEqualTo(1);

        deleteAccount(sessionCookie);

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_authorization where principal_name = ?",
                Integer.class,
                principalName
        )).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from oauth2_authorization_consent where principal_name = ?",
                Integer.class,
                principalName
        )).isZero();
    }
}
