package com.nabin.seogeo.audit.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AuditConfiguration {

    @Bean
    RestClient lighthouseRestClient(LighthouseProperties lighthouseProperties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(lighthouseProperties.getRequestTimeout());
        requestFactory.setReadTimeout(lighthouseProperties.getRequestTimeout());

        return RestClient.builder()
                .baseUrl(lighthouseProperties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Bean
    ObjectMapper auditObjectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
