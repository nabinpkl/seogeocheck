package com.nabin.seogeo;

import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spring Boot integration test verifies the full application context
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
		AuditStart auditStart = startAudit("example.com");

		var reportResult = restTestClient.get()
				.uri("/audits/{jobId}/report", auditStart.jobId())
				.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);

		assertThat(reportResult.getResponseBody()).isNotNull();
		assertThat(reportResult.getResponseBody().get("jobId")).isEqualTo(auditStart.jobId());
	}

	@Test
	void reportEventuallyReturnsVerifiedEvidence() throws Exception {
		AuditStart auditStart = startAudit("example.com");

		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		Map reportBody = null;
		HttpStatus reportStatus = HttpStatus.ACCEPTED;

		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", auditStart.jobId())
					.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
					.exchange()
					.returnResult(Map.class);
			reportStatus = HttpStatus.valueOf(reportResult.getStatus().value());
			reportBody = reportResult.getResponseBody();
			if (reportStatus == HttpStatus.OK
					&& reportBody != null
					&& "VERIFIED".equals(reportBody.get("status"))) {
				break;
			}
			Thread.sleep(250);
		}

		assertThat(reportBody).isNotNull();
		assertThat(reportStatus).isEqualTo(HttpStatus.OK);
		var verifiedReport = restTestClient.get()
				.uri("/audits/{jobId}/report", auditStart.jobId())
				.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
				.exchange()
				.expectStatus().isOk()
				.returnResult(AuditReportSchema.class)
				.getResponseBody();

		assertThat(verifiedReport).isNotNull();
		assertThat(verifiedReport.getJobId()).isEqualTo(auditStart.jobId());
		assertThat(verifiedReport.getStatus()).isEqualTo(AuditReportSchema.AuditStatus.VERIFIED);
		assertThat(verifiedReport.getSignature()).isNotNull();
		assertThat(verifiedReport.getReportType()).isEqualTo("SEO_SIGNALS_SIGNED_AUDIT");
		assertThat(verifiedReport.getChecks()).isNotEmpty();
		assertThat(verifiedReport.getSummary()).isNotNull();
	}

	@Test
	void streamReplaysEventsInOrderAndCompletesAfterReportIsPersisted() throws Exception {
		AuditStart auditStart = startAudit("example.com");
		awaitVerifiedReport(auditStart);

		var streamResult = restTestClient.get()
				.uri("/audits/{jobId}/stream", auditStart.jobId())
				.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
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
				.uri("/audits/{jobId}/report", auditStart.jobId())
				.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
				.exchange()
				.expectStatus().isOk()
				.returnResult(AuditReportSchema.class);

		assertThat(reportResult.getResponseBody()).isNotNull();
		assertThat(reportResult.getResponseBody().getStatus()).isEqualTo(AuditReportSchema.AuditStatus.VERIFIED);
		assertThat(auditEventRepository.findByJobIdOrderBySequenceAsc(auditStart.jobId()))
				.extracting(event -> event.getEventType())
				.endsWith("complete");
	}

	@Test
	void failedAuditReturnsTerminalFailurePayload() throws InterruptedException {
		AuditStart auditStart = startAudit("https://fail.example.com");

		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		Map reportBody = null;
		HttpStatus reportStatus = HttpStatus.ACCEPTED;

		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", auditStart.jobId())
					.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
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
		assertThat(reportBody).containsEntry("jobId", auditStart.jobId());
		assertThat(reportBody).containsEntry("status", "FAILED");
		assertThat(String.valueOf(reportBody.get("message")))
				.isEqualTo("We couldn't finish reviewing this site. Please try again in a moment.");
		assertThat(auditRunRepository.findById(auditStart.jobId())).isPresent();
		assertThat(auditRunRepository.findById(auditStart.jobId()).orElseThrow().getStatus()).isEqualTo(AuditStatus.FAILED);
	}

	@Test
	void unreachableAuditReturnsSpecificSeoSignalFailureMessage() throws InterruptedException {
		AuditStart auditStart = startAudit("https://unreachable.example.com");

		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		Map reportBody = null;
		HttpStatus reportStatus = HttpStatus.ACCEPTED;

		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", auditStart.jobId())
					.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
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
		assertThat(reportBody).containsEntry("jobId", auditStart.jobId());
		assertThat(reportBody).containsEntry("status", "FAILED");
		assertThat(String.valueOf(reportBody.get("message")))
				.isEqualTo("We couldn't reach that URL. Make sure the site is publicly accessible and try again.");
		assertThat(auditRunRepository.findById(auditStart.jobId())).isPresent();
		assertThat(auditRunRepository.findById(auditStart.jobId()).orElseThrow().getStatus()).isEqualTo(AuditStatus.FAILED);
	}

	private AuditStart startAudit(String url) {
		var startResult = restTestClient.post()
				.uri("/audits")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("url", url))
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.ACCEPTED)
				.returnResult(Map.class);
		Map<String, Object> responseBody = startResult.getResponseBody();
		String sessionCookie = extractCookie(startResult.getResponseHeaders(), "seogeo_session");
		String claimToken = responseBody.get("claimToken") == null ? null : String.valueOf(responseBody.get("claimToken"));
		if (sessionCookie == null && claimToken != null) {
			sessionCookie = continueAsGuestAndExtractSessionCookie(claimToken);
		}
		return new AuditStart(
				String.valueOf(responseBody.get("jobId")),
				sessionCookie
		);
	}

	private void awaitVerifiedReport(AuditStart auditStart) throws InterruptedException {
		Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
		while (Instant.now().isBefore(deadline)) {
			var reportResult = restTestClient.get()
					.uri("/audits/{jobId}/report", auditStart.jobId())
					.header(HttpHeaders.COOKIE, auditStart.sessionCookie())
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

	private static String extractCookie(HttpHeaders headers, String name) {
		return headers.getValuesAsList(HttpHeaders.SET_COOKIE).stream()
				.map(value -> value.split(";", 2)[0])
				.filter(value -> value.startsWith(name + "="))
				.findFirst()
				.orElse(null);
	}

	private String continueAsGuestAndExtractSessionCookie(String claimToken) {
		CsrfState csrfState = fetchCsrfState();
		var guestResult = restTestClient.post()
				.uri("/auth/guest")
				.contentType(MediaType.APPLICATION_JSON)
				.header("X-XSRF-TOKEN", csrfState.token())
				.header(HttpHeaders.COOKIE, csrfState.cookie())
				.body(Map.of("claimToken", claimToken))
				.exchange()
				.expectStatus().isOk()
				.returnResult(Map.class);
		return extractCookie(guestResult.getResponseHeaders(), "seogeo_session");
	}

	private CsrfState fetchCsrfState() {
		var csrfResult = restTestClient.get()
				.uri("/auth/csrf")
				.exchange()
				.expectStatus().isOk()
				.returnResult(Map.class);
		String cookie = extractCookie(csrfResult.getResponseHeaders(), "XSRF-TOKEN");
		return new CsrfState(String.valueOf(csrfResult.getResponseBody().get("token")), cookie);
	}

	private record AuditStart(String jobId, String sessionCookie) {
	}

	private record CsrfState(String token, String cookie) {
	}
}
