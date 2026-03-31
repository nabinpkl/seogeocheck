package com.nabin.seogeo.auth.config;

import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Component
public class OAuthKeyMaterial {

    private final OAuthProperties oAuthProperties;

    public OAuthKeyMaterial(OAuthProperties oAuthProperties) {
        this.oAuthProperties = oAuthProperties;
    }

    public RSAKey toRsaJwk() {
        return new RSAKey.Builder(readPublicKey(oAuthProperties.getPublicKey()))
                .privateKey(readPrivateKey(oAuthProperties.getPrivateKey()))
                .keyID(oAuthProperties.getKeyId())
                .build();
    }

    private static RSAPrivateKey readPrivateKey(String value) {
        try {
            byte[] decoded = decodeKeyMaterial(value, "PRIVATE KEY");
            return (RSAPrivateKey) KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (Exception exception) {
            throw new IllegalStateException("Invalid OAuth private key configuration.", exception);
        }
    }

    private static RSAPublicKey readPublicKey(String value) {
        try {
            byte[] decoded = decodeKeyMaterial(value, "PUBLIC KEY");
            return (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(decoded));
        } catch (Exception exception) {
            throw new IllegalStateException("Invalid OAuth public key configuration.", exception);
        }
    }

    private static byte[] decodeKeyMaterial(String value, String label) {
        String normalized = value == null ? "" : value.trim();
        if (!StringUtils.hasText(normalized)) {
            throw new IllegalStateException("OAuth key material is missing.");
        }

        if (normalized.contains("BEGIN " + label)) {
            normalized = normalized
                    .replace("-----BEGIN " + label + "-----", "")
                    .replace("-----END " + label + "-----", "")
                    .replaceAll("\\s+", "");
        } else {
            normalized = normalized.replaceAll("\\s+", "");
        }

        return Base64.getDecoder().decode(normalized.getBytes(StandardCharsets.UTF_8));
    }
}
