package com.nabin.seogeo.auth;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
class AuthIntegrationTestConfiguration {

    @Bean
    @Primary
    AbstractAuthIntegrationTest.CapturingAuthEmailSender verificationEmailSender() {
        return new AbstractAuthIntegrationTest.CapturingAuthEmailSender();
    }
}
