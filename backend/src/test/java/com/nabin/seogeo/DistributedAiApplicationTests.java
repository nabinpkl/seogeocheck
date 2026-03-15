package com.nabin.seogeo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spring Boot integration test — verifies the full application context
 * loads successfully and core beans are wired.
 *
 * Uses the "test" profile which swaps PostgreSQL for H2 in-memory
 * and enables Temporal's built-in test server.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
class DistributedAiApplicationTests {

	@Autowired
	private RestTestClient restTestClient;

	@Autowired
	private ApplicationContext applicationContext;

	@Test
	void contextLoads() {
		// Verifies the full application context can start
		assertThat(applicationContext).isNotNull();
	}

	@Test
	void healthEndpointWorks() {
		restTestClient.get().uri("/health")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class).value(body -> assertThat(body).contains("\"status\":\"UP\""));
	}

	@Test
	void researchControllerBeanExists() {
		assertThat(applicationContext.containsBean("researchController")).isTrue();
	}

	@Test
	void researchServiceBeanExists() {
		assertThat(applicationContext.containsBean("researchService")).isTrue();
	}
}
