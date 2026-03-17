package com.nabin.seogeo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

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
				.expectBody(Map.class)
				.value(body -> assertThat(body).containsEntry("status", "UP"));
	}

	@Test
	void auditStartReturnsJobHandles() {
		var result = restTestClient.post()
				.uri("/audits")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("url", "example.com"))
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);

		assertThat(result.getResponseBody()).isNotNull();
		assertThat(result.getResponseBody().get("jobId")).asString().startsWith("audit_");
		assertThat(result.getResponseBody()).containsEntry("status", "QUEUED");
		assertThat(result.getResponseBody().get("streamUrl")).asString().contains("/audits/");
		assertThat(result.getResponseBody().get("reportUrl")).asString().contains("/audits/");
	}

	@Test
	void reportReturnsAcceptedBeforeItIsReady() {
		var startResult = restTestClient.post()
				.uri("/audits")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("url", "example.com"))
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);
		String jobId = String.valueOf(startResult.getResponseBody().get("jobId"));

		var reportResult = restTestClient.get()
				.uri("/audits/{jobId}/report", jobId)
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);

		assertThat(reportResult.getResponseBody()).isNotNull();
		assertThat(reportResult.getResponseBody().get("jobId")).isEqualTo(jobId);
	}

	@Test
	void reportEventuallyReturnsVerifiedEvidence() throws InterruptedException {
		var startResult = restTestClient.post()
				.uri("/audits")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("url", "example.com"))
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);
		String jobId = String.valueOf(startResult.getResponseBody().get("jobId"));

		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		Map reportBody = null;
		HttpStatus reportStatus = HttpStatus.ACCEPTED;

		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", jobId)
					.exchange()
					.returnResult(Map.class);
			reportStatus = HttpStatus.valueOf(reportResult.getStatus().value());
			reportBody = reportResult.getResponseBody();
			if (reportStatus == HttpStatus.OK) {
				break;
			}
			Thread.sleep(250);
		}

		assertThat(reportBody).isNotNull();
		assertThat(reportStatus).isEqualTo(HttpStatus.OK);
		assertThat(reportBody).containsEntry("jobId", jobId);
		assertThat(reportBody).containsEntry("status", "VERIFIED");
		assertThat(reportBody).containsKey("signature");
	}
}
