package com.nabin.seogeo.auth;

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

import com.nabin.seogeo.auth.config.OAuthProperties;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
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

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private OAuthProperties oAuthProperties;

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
    void verifiedUserCanApproveConsentExchangeCodeAndCallMcp() {
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

        restTestClient.get()
                .uri("/mcp")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenBody.get("access_token"))
                .exchange()
                .expectStatus().isOk()
                .expectBody(Map.class)
                .value(body -> {
                    assertThat(body).containsEntry("status", "ready");
                    assertThat(body).containsEntry("transport", "streamable-http");
                });
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
                    assertThat(body.get("resource")).asString().contains("/mcp");
                    assertThat((List<String>) body.get("authorization_servers")).contains(oAuthProperties.getIssuer());
                    assertThat((List<String>) body.get("scopes_supported")).contains(REQUESTED_SCOPE);
                });
    }

    @Test
    void mcpRejectsMissingAndInvalidJwtClaims() {
        restTestClient.get()
                .uri("/mcp")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().value(HttpHeaders.WWW_AUTHENTICATE, value -> assertThat(value).contains("Bearer"));

        restTestClient.get()
                .uri("/mcp")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + mintAccessToken(Map.of(
                        "scope", REQUESTED_SCOPE,
                        "email_verified", false,
                        "account_kind", "EMAIL_VERIFIED"
                )))
                .exchange()
                .expectStatus().isUnauthorized();

        restTestClient.get()
                .uri("/mcp")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + mintAccessToken(Map.of(
                        "scope", REQUESTED_SCOPE,
                        "email_verified", true,
                        "account_kind", "ANONYMOUS"
                )))
                .exchange()
                .expectStatus().isUnauthorized();
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
                .audience(List.of("seogeo-mcp-test"))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300));
        claims.forEach(claimsBuilder::claim);
        return jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(),
                claimsBuilder.build()
        )).getTokenValue();
    }

    private record AuthorizationCodeGrant(String consentUri, String consentState) {
    }
}
