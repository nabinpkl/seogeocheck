package com.nabin.seogeo.auth.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.authorization.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.jackson.SecurityJacksonModules;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.token.DelegatingOAuth2TokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.JwtGenerator;
import org.springframework.security.oauth2.server.authorization.token.OAuth2AccessTokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

import com.nabin.seogeo.auth.domain.AuthAccountKind;
import com.nabin.seogeo.auth.domain.AuthenticatedUser;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Configuration
public class OAuthAuthorizationServerConfiguration {

    public static final String CONSENT_PAGE_URI = "/oauth2/consent";

    @Bean
    RegisteredClientRepository registeredClientRepository(JdbcTemplate jdbcTemplate) {
        return new JdbcRegisteredClientRepository(jdbcTemplate);
    }

    @Bean
    OAuth2AuthorizationService authorizationService(
            JdbcTemplate jdbcTemplate,
            RegisteredClientRepository registeredClientRepository
    ) {
        JdbcOAuth2AuthorizationService authorizationService =
                new JdbcOAuth2AuthorizationService(jdbcTemplate, registeredClientRepository);
        JsonMapper authorizationJsonMapper = JsonMapper.builder()
                .addModules(SecurityJacksonModules.getModules(
                        OAuthAuthorizationServerConfiguration.class.getClassLoader(),
                        BasicPolymorphicTypeValidator.builder().allowIfSubType(AuthenticatedUser.class)
                ))
                .build();
        JdbcOAuth2AuthorizationService.JsonMapperOAuth2AuthorizationRowMapper authorizationRowMapper =
                new JdbcOAuth2AuthorizationService.JsonMapperOAuth2AuthorizationRowMapper(
                        registeredClientRepository,
                        authorizationJsonMapper
                );
        authorizationService.setAuthorizationRowMapper(authorizationRowMapper);
        authorizationService.setAuthorizationParametersMapper(
                new JdbcOAuth2AuthorizationService.JsonMapperOAuth2AuthorizationParametersMapper(authorizationJsonMapper)
        );
        return authorizationService;
    }

    @Bean
    OAuth2AuthorizationConsentService authorizationConsentService(
            JdbcTemplate jdbcTemplate,
            RegisteredClientRepository registeredClientRepository
    ) {
        return new JdbcOAuth2AuthorizationConsentService(jdbcTemplate, registeredClientRepository);
    }

    @Bean
    AuthorizationServerSettings authorizationServerSettings(OAuthProperties oAuthProperties) {
        return AuthorizationServerSettings.builder()
                .issuer(oAuthProperties.getIssuer())
                .authorizationEndpoint("/oauth2/authorize")
                .tokenEndpoint("/oauth2/token")
                .tokenRevocationEndpoint("/oauth2/revoke")
                .jwkSetEndpoint("/oauth2/jwks")
                .build();
    }

    @Bean
    JWKSource<SecurityContext> jwkSource(OAuthKeyMaterial keyMaterial) {
        return new ImmutableJWKSet<>(new JWKSet(keyMaterial.toRsaJwk()));
    }

    @Bean
    JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource, OAuthProperties oAuthProperties) {
        JwtDecoder decoder = OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
        if (decoder instanceof org.springframework.security.oauth2.jwt.NimbusJwtDecoder nimbusJwtDecoder) {
            nimbusJwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(oAuthProperties.getIssuer()),
                    new JwtClaimValidator<>("aud", aud -> containsAudience(aud, oAuthProperties.getMcpResourceUri())),
                    new JwtClaimValidator<>("scope", scope -> containsScope(scope, oAuthProperties.getMcpScope())),
                    new JwtClaimValidator<>("email_verified", Boolean.TRUE::equals),
                    new JwtClaimValidator<>("account_kind",
                            accountKind -> accountKind instanceof String value && !AuthAccountKind.ANONYMOUS.name().equals(value))
            ));
        }
        return decoder;
    }

    @Bean
    OAuth2TokenGenerator<?> tokenGenerator(
            JwtEncoder jwtEncoder,
            OAuth2TokenCustomizer<JwtEncodingContext> jwtTokenCustomizer
    ) {
        JwtGenerator jwtGenerator = new JwtGenerator(jwtEncoder);
        jwtGenerator.setJwtCustomizer(jwtTokenCustomizer);

        OAuth2AccessTokenGenerator accessTokenGenerator = new OAuth2AccessTokenGenerator();
        PublicClientRefreshTokenGenerator refreshTokenGenerator = new PublicClientRefreshTokenGenerator();

        return new DelegatingOAuth2TokenGenerator(jwtGenerator, accessTokenGenerator, refreshTokenGenerator);
    }

    @Bean
    OAuth2TokenCustomizer<JwtEncodingContext> jwtTokenCustomizer(
            AuthUserRepository authUserRepository,
            OAuthProperties oAuthProperties
    ) {
        return (context) -> {
            if (!OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
                return;
            }

            String principalName = context.getAuthorization().getPrincipalName();
            Optional<AuthUserEntity> userOptional = authUserRepository.findById(UUID.fromString(principalName));
            if (userOptional.isEmpty()) {
                throw new org.springframework.security.oauth2.core.OAuth2AuthenticationException(
                        new OAuth2Error(OAuth2ErrorCodes.SERVER_ERROR, "OAuth subject is missing.", null)
                );
            }

            AuthUserEntity user = userOptional.get();
            context.getClaims().subject(principalName);
            context.getClaims().claim("aud", oAuthProperties.getMcpResourceUri());
            context.getClaims().claim("scope", String.join(" ", context.getAuthorizedScopes()));
            context.getClaims().claim("account_kind", user.getAccountKind().name());
            context.getClaims().claim("email_verified", user.getEmailVerifiedAt() != null);
        };
    }

    @Bean
    @Order(1)
    SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http,
            OAuthLoginRedirectEntryPoint oauthLoginRedirectEntryPoint,
            RegisteredClientRepository registeredClientRepository,
            OAuthAuthorizationUserGuardFilter oauthAuthorizationUserGuardFilter,
            OAuthProperties oAuthProperties
    ) throws Exception {
        http.oauth2AuthorizationServer((authorizationServer) ->
                authorizationServer
                        .authorizationServerMetadataEndpoint((metadataEndpoint) ->
                                metadataEndpoint.authorizationServerMetadataCustomizer((builder) -> builder
                                        .grantTypes((grantTypes) -> {
                                            grantTypes.clear();
                                            grantTypes.add(AuthorizationGrantType.AUTHORIZATION_CODE.getValue());
                                            grantTypes.add(AuthorizationGrantType.REFRESH_TOKEN.getValue());
                                        })
                                        .responseTypes((responseTypes) -> {
                                            responseTypes.clear();
                                            responseTypes.add("code");
                                        })
                                        .tokenEndpointAuthenticationMethods((authenticationMethods) -> {
                                            authenticationMethods.clear();
                                            authenticationMethods.add("none");
                                        })
                                        .tokenRevocationEndpointAuthenticationMethods((authenticationMethods) -> {
                                            authenticationMethods.clear();
                                            authenticationMethods.add("none");
                                        })
                                        .scopes((scopes) -> {
                                            scopes.clear();
                                            scopes.add(oAuthProperties.getMcpScope());
                                        })
                                        .codeChallengeMethods((codeChallengeMethods) -> {
                                            codeChallengeMethods.clear();
                                            codeChallengeMethods.add("S256");
                                        })
                                        .tlsClientCertificateBoundAccessTokens(false)
                                )
                        )
                        .authorizationEndpoint((authorizationEndpoint) ->
                                authorizationEndpoint.consentPage(CONSENT_PAGE_URI)
                        )
                        .clientAuthentication((clientAuthentication) -> clientAuthentication
                                .authenticationConverter(new PublicRefreshTokenClientAuthenticationConverter())
                                .authenticationProvider(
                                        new PublicRefreshTokenClientAuthenticationProvider(registeredClientRepository)
                                )
                        )
        );

        OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
                http.getConfigurer(OAuth2AuthorizationServerConfigurer.class);
        RequestMatcher endpointsMatcher = authorizationServerConfigurer.getEndpointsMatcher();
        RequestMatcher consentMatcher = PathPatternRequestMatcher.withDefaults().matcher(CONSENT_PAGE_URI);
        RequestMatcher matcher = new OrRequestMatcher(endpointsMatcher, consentMatcher);

        http
                .securityMatcher(matcher)
                .csrf((csrf) -> csrf.ignoringRequestMatchers(matcher))
                .addFilterAfter(oauthAuthorizationUserGuardFilter, SecurityContextHolderFilter.class)
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/.well-known/oauth-authorization-server"))
                        .permitAll()
                        .requestMatchers(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/.well-known/oauth-authorization-server/**"))
                        .permitAll()
                        .requestMatchers(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/oauth2/jwks"))
                        .permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling((exceptions) -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                oauthLoginRedirectEntryPoint,
                                new OrRequestMatcher(
                                        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/oauth2/authorize"),
                                        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, CONSENT_PAGE_URI)
                                )
                        )
                );

        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain mcpSecurityFilterChain(
            HttpSecurity http,
            JwtDecoder jwtDecoder,
            OAuthProperties oAuthProperties
    ) throws Exception {
        http
                .securityMatcher(new OrRequestMatcher(
                        PathPatternRequestMatcher.withDefaults().matcher("/mcp"),
                        PathPatternRequestMatcher.withDefaults().matcher("/mcp/**"),
                        PathPatternRequestMatcher.withDefaults().matcher("/.well-known/oauth-protected-resource"),
                        PathPatternRequestMatcher.withDefaults().matcher("/.well-known/oauth-protected-resource/**")
                ))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers(PathPatternRequestMatcher.withDefaults().matcher("/.well-known/oauth-protected-resource"))
                        .permitAll()
                        .requestMatchers(PathPatternRequestMatcher.withDefaults().matcher("/.well-known/oauth-protected-resource/**"))
                        .permitAll()
                        .anyRequest().hasAuthority("SCOPE_" + oAuthProperties.getMcpScope())
                )
                .exceptionHandling((exceptions) -> exceptions
                        .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                        .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
                )
                .oauth2ResourceServer((oauth2) -> oauth2
                        .protectedResourceMetadata((metadata) -> metadata
                                .protectedResourceMetadataCustomizer((builder) -> builder
                                        .resource(oAuthProperties.getMcpResourceUri())
                                        .authorizationServer(oAuthProperties.getIssuer())
                                        .scope(oAuthProperties.getMcpScope())
                                        .resourceName("SEOGEO MCP")
                                        .tlsClientCertificateBoundAccessTokens(false)
                                )
                        )
                        .jwt((jwt) -> jwt.decoder(jwtDecoder))
                );

        return http.build();
    }

    private static boolean containsScope(Object claimValue, String expectedScope) {
        if (claimValue instanceof String value) {
            return Set.of(value.split("\\s+")).contains(expectedScope);
        }
        if (claimValue instanceof Iterable<?> iterable) {
            for (Object value : iterable) {
                if (expectedScope.equals(String.valueOf(value))) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean containsAudience(Object claimValue, String expectedAudience) {
        if (claimValue instanceof String value) {
            return expectedAudience.equals(value);
        }
        if (claimValue instanceof Iterable<?> iterable) {
            for (Object value : iterable) {
                if (expectedAudience.equals(String.valueOf(value))) {
                    return true;
                }
            }
        }
        return false;
    }
}
