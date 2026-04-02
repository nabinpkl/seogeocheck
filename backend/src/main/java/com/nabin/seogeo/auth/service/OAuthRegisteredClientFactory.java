package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.config.OAuthProperties;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class OAuthRegisteredClientFactory {

    private final OAuthProperties oAuthProperties;

    public OAuthRegisteredClientFactory(OAuthProperties oAuthProperties) {
        this.oAuthProperties = oAuthProperties;
    }

    public RegisteredClient createDynamicPublicPkceClient(
            String clientName,
            List<String> redirectUris
    ) {
        Set<String> uniqueRedirectUris = new LinkedHashSet<>(redirectUris);
        Instant issuedAt = Instant.now();
        return RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId("mcp-" + UUID.randomUUID())
                .clientIdIssuedAt(issuedAt)
                .clientName(clientName)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUris((uris) -> uris.addAll(uniqueRedirectUris))
                .scope(oAuthProperties.getMcpScope())
                .clientSettings(publicClientSettings())
                .tokenSettings(tokenSettings())
                .build();
    }

    public TokenSettings tokenSettings() {
        return TokenSettings.builder()
                .authorizationCodeTimeToLive(oAuthProperties.getAuthorizationCodeTtl())
                .accessTokenTimeToLive(oAuthProperties.getAccessTokenTtl())
                .refreshTokenTimeToLive(oAuthProperties.getRefreshTokenTtl())
                .reuseRefreshTokens(false)
                .build();
    }

    private ClientSettings publicClientSettings() {
        return ClientSettings.builder()
                .requireAuthorizationConsent(true)
                .requireProofKey(true)
                .build();
    }
}
