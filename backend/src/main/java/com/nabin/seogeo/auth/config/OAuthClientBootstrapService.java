package com.nabin.seogeo.auth.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Component
public class OAuthClientBootstrapService implements ApplicationRunner {

    private final OAuthProperties oAuthProperties;
    private final RegisteredClientRepository registeredClientRepository;

    public OAuthClientBootstrapService(
            OAuthProperties oAuthProperties,
            RegisteredClientRepository registeredClientRepository
    ) {
        this.oAuthProperties = oAuthProperties;
        this.registeredClientRepository = registeredClientRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (OAuthProperties.Client client : oAuthProperties.getClients()) {
            RegisteredClient existing = registeredClientRepository.findByClientId(client.getClientId());
            Instant issuedAt = existing == null ? Instant.now() : existing.getClientIdIssuedAt();
            String registeredClientId = existing == null ? client.getId() : existing.getId();

            TokenSettings tokenSettings = TokenSettings.builder()
                    .authorizationCodeTimeToLive(oAuthProperties.getAuthorizationCodeTtl())
                    .accessTokenTimeToLive(Duration.ofMinutes(client.getAccessTokenMinutes()))
                    .refreshTokenTimeToLive(Duration.ofDays(client.getRefreshTokenDays()))
                    .reuseRefreshTokens(false)
                    .build();

            Set<String> redirectUris = new LinkedHashSet<>(client.getRedirectUris());
            RegisteredClient registeredClient = RegisteredClient.withId(registeredClientId)
                    .clientId(client.getClientId())
                    .clientIdIssuedAt(issuedAt)
                    .clientName(client.getClientName())
                    .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                    .redirectUris((uris) -> uris.addAll(redirectUris))
                    .scope(oAuthProperties.getMcpScope())
                    .clientSettings(ClientSettings.builder()
                            .requireAuthorizationConsent(true)
                            .requireProofKey(true)
                            .build())
                    .tokenSettings(tokenSettings)
                    .build();

            registeredClientRepository.save(registeredClient);
        }
    }
}
