package com.nabin.seogeo.auth.service;

import com.nabin.seogeo.auth.config.OAuthProperties;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.server.authorization.OAuth2ClientMetadataClaimNames;
import org.springframework.security.oauth2.server.authorization.OAuth2ClientRegistration;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.Set;

@Component
public class OAuthDynamicClientRegistrationConverter implements Converter<OAuth2ClientRegistration, RegisteredClient> {

    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "::1");
    private static final Set<String> ALLOWED_GRANTS = Set.of(
            AuthorizationGrantType.AUTHORIZATION_CODE.getValue(),
            AuthorizationGrantType.REFRESH_TOKEN.getValue()
    );

    private final OAuthRegisteredClientFactory registeredClientFactory;
    private final OAuthProperties oAuthProperties;

    public OAuthDynamicClientRegistrationConverter(
            OAuthRegisteredClientFactory registeredClientFactory,
            OAuthProperties oAuthProperties
    ) {
        this.registeredClientFactory = registeredClientFactory;
        this.oAuthProperties = oAuthProperties;
    }

    @Override
    public RegisteredClient convert(OAuth2ClientRegistration clientRegistration) {
        if (clientRegistration.getClientName() == null || clientRegistration.getClientName().isBlank()) {
            throw invalidClientMetadata(OAuth2ClientMetadataClaimNames.CLIENT_NAME, "Client name is required.");
        }
        if (clientRegistration.getRedirectUris() == null || clientRegistration.getRedirectUris().isEmpty()) {
            throw invalidClientMetadata(OAuth2ClientMetadataClaimNames.REDIRECT_URIS, "At least one redirect URI is required.");
        }

        validateTokenEndpointAuthenticationMethod(clientRegistration.getTokenEndpointAuthenticationMethod());
        validateGrantTypes(clientRegistration.getGrantTypes());
        validateResponseTypes(clientRegistration.getResponseTypes());
        validateScope(clientRegistration.getScopes());
        clientRegistration.getRedirectUris().forEach(this::validateRedirectUri);

        return registeredClientFactory.createDynamicPublicPkceClient(
                clientRegistration.getClientName(),
                clientRegistration.getRedirectUris()
        );
    }

    private void validateTokenEndpointAuthenticationMethod(String tokenEndpointAuthenticationMethod) {
        if (tokenEndpointAuthenticationMethod == null || tokenEndpointAuthenticationMethod.isBlank()) {
            return;
        }
        if (!ClientAuthenticationMethod.NONE.getValue().equals(tokenEndpointAuthenticationMethod)) {
            throw invalidClientMetadata(
                    OAuth2ClientMetadataClaimNames.TOKEN_ENDPOINT_AUTH_METHOD,
                    "Only public PKCE clients are supported."
            );
        }
    }

    private void validateGrantTypes(List<String> grantTypes) {
        if (grantTypes == null || grantTypes.isEmpty()) {
            return;
        }
        if (!ALLOWED_GRANTS.equals(Set.copyOf(grantTypes))) {
            throw invalidClientMetadata(
                    OAuth2ClientMetadataClaimNames.GRANT_TYPES,
                    "Only authorization_code and refresh_token grants are supported."
            );
        }
    }

    private void validateResponseTypes(List<String> responseTypes) {
        if (responseTypes == null || responseTypes.isEmpty()) {
            return;
        }
        if (!Set.of("code").equals(Set.copyOf(responseTypes))) {
            throw invalidClientMetadata(
                    OAuth2ClientMetadataClaimNames.RESPONSE_TYPES,
                    "Only the code response type is supported."
            );
        }
    }

    private void validateScope(List<String> scopes) {
        if (scopes == null || scopes.isEmpty()) {
            return;
        }
        if (!Set.of(oAuthProperties.getMcpScope()).equals(Set.copyOf(scopes))) {
            throw invalidClientMetadata(
                    OAuth2ClientMetadataClaimNames.SCOPE,
                    "Only the MCP scope is supported."
            );
        }
    }

    private void validateRedirectUri(String redirectUri) {
        URI uri;
        try {
            uri = URI.create(redirectUri);
        } catch (IllegalArgumentException exception) {
            throw invalidRedirectUri("Redirect URI is invalid.");
        }

        if (uri.getFragment() != null || uri.getRawQuery() != null) {
            throw invalidRedirectUri("Redirect URI must not contain a query string or fragment.");
        }
        if (uri.getHost() == null) {
            throw invalidRedirectUri("Redirect URI host is required.");
        }
        if ("https".equalsIgnoreCase(uri.getScheme())) {
            return;
        }
        if ("http".equalsIgnoreCase(uri.getScheme())
                && LOOPBACK_HOSTS.stream().anyMatch(host -> host.equalsIgnoreCase(uri.getHost()))
                && uri.getPort() > 0) {
            return;
        }
        throw invalidRedirectUri("Redirect URI must be https or an explicit loopback http URL.");
    }

    private OAuth2AuthenticationException invalidClientMetadata(String fieldName, String description) {
        return new OAuth2AuthenticationException(new OAuth2Error(
                "invalid_client_metadata",
                "Invalid Client Registration: " + fieldName + ". " + description,
                "https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.2"
        ));
    }

    private OAuth2AuthenticationException invalidRedirectUri(String description) {
        return new OAuth2AuthenticationException(new OAuth2Error(
                OAuth2ErrorCodes.INVALID_REDIRECT_URI,
                description,
                "https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.2"
        ));
    }
}
