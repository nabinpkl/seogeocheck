package com.nabin.seogeo;

import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
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
class SeoGeoApplicationTests {

	@Autowired
	private RestTestClient restTestClient;

	@Autowired
	private ApplicationContext applicationContext;

	@Autowired
	private AuditRunRepository auditRunRepository;

	@Autowired
	private AuditEventRepository auditEventRepository;

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

		String jobId = String.valueOf(result.getResponseBody().get("jobId"));
		assertThat(auditRunRepository.findById(jobId)).isPresent();
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
		assertThat(reportBody).containsEntry("reportType", "LIGHTHOUSE_SIGNED_AUDIT");
		assertThat(reportBody).containsKey("checks");
		assertThat(reportBody).containsKey("summary");
	}

	@Test
	void streamReplaysEventsInOrderAndCompletesAfterReportIsPersisted() throws InterruptedException {
		String jobId = startAudit("example.com");
		awaitVerifiedReport(jobId);

		var streamResult = restTestClient.get()
				.uri("/audits/{jobId}/stream", jobId)
				.accept(MediaType.TEXT_EVENT_STREAM)
				.exchange()
				.expectStatus().isOk()
				.returnResult(String.class);

		String body = streamResult.getResponseBody();
		assertThat(body).isNotNull();
		assertThat(body).contains("\"type\":\"status\"");
		assertThat(body).contains("\"type\":\"check\"");
		assertThat(body).contains("\"checkStatus\":\"issue\"");
		assertThat(body).contains("\"checkStatus\":\"passed\"");
		assertThat(body).contains("\"type\":\"complete\"");

		var reportResult = restTestClient.get()
				.uri("/audits/{jobId}/report", jobId)
				.exchange()
				.expectStatus().isOk()
				.returnResult(Map.class);

		assertThat(reportResult.getResponseBody()).isNotNull();
		assertThat(reportResult.getResponseBody()).containsEntry("status", "VERIFIED");
		assertThat(auditEventRepository.findByJobIdOrderBySequenceAsc(jobId))
				.extracting(event -> event.getEventType())
				.endsWith("complete");
	}

	@Test
	void failedAuditReturnsTerminalFailurePayload() throws InterruptedException {
		String jobId = startAudit("https://fail.example.com");

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
			if (reportBody != null && "FAILED".equals(reportBody.get("status"))) {
				break;
			}
			Thread.sleep(200);
		}

		assertThat(reportStatus).isEqualTo(HttpStatus.OK);
		assertThat(reportBody).isNotNull();
		assertThat(reportBody).containsEntry("jobId", jobId);
		assertThat(reportBody).containsEntry("status", "FAILED");
		assertThat(String.valueOf(reportBody.get("message")))
				.isEqualTo("We couldn't finish reviewing this site. Please try again in a moment.");
		assertThat(auditRunRepository.findById(jobId)).isPresent();
		assertThat(auditRunRepository.findById(jobId).orElseThrow().getStatus()).isEqualTo(AuditStatus.FAILED);
	}

	private String startAudit(String url) {
		var startResult = restTestClient.post()
				.uri("/audits")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("url", url))
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);
		return String.valueOf(startResult.getResponseBody().get("jobId"));
	}

	private void awaitVerifiedReport(String jobId) throws InterruptedException {
		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", jobId)
					.exchange()
					.returnResult(Map.class);
			if (reportResult.getStatus().value() == HttpStatus.OK.value()
					&& reportResult.getResponseBody() != null
					&& "VERIFIED".equals(reportResult.getResponseBody().get("status"))) {
				return;
			}
			Thread.sleep(200);
		}

		throw new AssertionError("Audit report was not verified in time.");
	}
}
