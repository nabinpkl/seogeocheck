package com.nabin.seogeo.audit.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuditConfiguration {

    @Bean
    ObjectMapper auditObjectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
