package com.nabin.seogeo.auth.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.lang.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2ClientAuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationConverter;
import java.util.HashMap;
import java.util.Map;

public final class PublicRefreshTokenClientAuthenticationConverter implements AuthenticationConverter {

    @Nullable
    @Override
    public Authentication convert(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) {
            return null;
        }

        String grantType = request.getParameter(OAuth2ParameterNames.GRANT_TYPE);
        boolean refreshTokenGrant = "refresh_token".equals(grantType);
        boolean tokenRevocationRequest = request.getRequestURI().endsWith("/oauth2/revoke")
                && request.getParameter(OAuth2ParameterNames.TOKEN) != null;
        if (!refreshTokenGrant && !tokenRevocationRequest) {
            return null;
        }

        String[] clientIds = request.getParameterValues(OAuth2ParameterNames.CLIENT_ID);
        if (clientIds == null || clientIds.length != 1) {
            throw new OAuth2AuthenticationException(OAuth2ErrorCodes.INVALID_REQUEST);
        }

        String clientId = clientIds[0];

        Map<String, Object> additionalParameters = new HashMap<>();
        request.getParameterMap().forEach((key, value) -> {
            if (!OAuth2ParameterNames.CLIENT_ID.equals(key)) {
                additionalParameters.put(key, value.length == 1 ? value[0] : value);
            }
        });

        return new OAuth2ClientAuthenticationToken(clientId, ClientAuthenticationMethod.NONE, null, additionalParameters);
    }
}
