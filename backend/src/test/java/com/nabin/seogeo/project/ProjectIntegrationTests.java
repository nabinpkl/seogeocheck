package com.nabin.seogeo.project;

import com.nabin.seogeo.audit.contract.generated.AuditReportSchema;
import com.nabin.seogeo.auth.persistence.AuthEmailVerificationTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserEntity;
import com.nabin.seogeo.auth.persistence.AuthPasswordResetTokenRepository;
import com.nabin.seogeo.auth.persistence.AuthUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
class ProjectIntegrationTests {

    @Autowired
    private RestTestClient restTestClient;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private AuthPasswordResetTokenRepository authPasswordResetTokenRepository;

    @Autowired
    private AuthEmailVerificationTokenRepository authEmailVerificationTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from spring_session_attributes");
        jdbcTemplate.update("delete from spring_session");
        jdbcTemplate.update("delete from audit_claim_tokens");
        jdbcTemplate.update("delete from audit_run_summary_high_issues");
        jdbcTemplate.update("delete from audit_run_summaries");
        jdbcTemplate.update("delete from audit_project_links");
        jdbcTemplate.update("delete from project_tracked_urls");
        jdbcTemplate.update("delete from projects");
        jdbcTemplate.update("delete from audit_reports");
        jdbcTemplate.update("delete from audit_events");
        jdbcTemplate.update("delete from audit_runs");
        authPasswordResetTokenRepository.deleteAll();
        authEmailVerificationTokenRepository.deleteAll();
        authUserRepository.deleteAll();
    }

    @Test
    void attachingRepeatedAuditsForTheSameUrlReusesOneTrackedUrl() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String firstJobId = startOwnedAudit(sessionCookie, "https://example.com");
        String secondJobId = startOwnedAudit(sessionCookie, "https://example.com");
        awaitVerifiedReport(sessionCookie, firstJobId);
        awaitVerifiedReport(sessionCookie, secondJobId);

        String projectSlug = createProject(sessionCookie, "Example Site");
        attachAudit(sessionCookie, projectSlug, firstJobId);
        attachAudit(sessionCookie, projectSlug, secondJobId);

        restTestClient.get()
                .uri("/account/projects/{slug}/urls", projectSlug)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(1);
                    Map<String, Object> trackedUrl = (Map<String, Object>) body.getFirst();
                    assertThat(trackedUrl.get("auditCount")).isEqualTo(2);
                    assertThat(trackedUrl.get("trackedUrl")).isEqualTo("https://example.com");
                });

        restTestClient.get()
                .uri("/account/projects")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    Map<String, Object> project = findProject(body, projectSlug);
                    assertThat(project.get("trackedUrlCount")).isEqualTo(1);
                    assertThat(project.get("auditCount")).isEqualTo(2);
                    assertThat(project.get("projectScore")).isNotNull();
                });
    }

    @Test
    void loginCreatesDefaultProjectAndStartingAuditWithoutSelectedProjectAttachesItThere() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String jobId = startOwnedAudit(sessionCookie, "https://example.com");
        awaitVerifiedReport(sessionCookie, jobId);

        restTestClient.get()
                .uri("/account/projects")
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(1);
                    Map<String, Object> project = (Map<String, Object>) body.getFirst();
                    assertThat(project.get("isDefault")).isEqualTo(true);
                    assertThat(project.get("trackedUrlCount")).isEqualTo(1);
                    assertThat(project.get("auditCount")).isEqualTo(1);
                });
    }

    @Test
    void startingAuditWithExplicitProjectAttachesItToThatProject() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String projectSlug = createProject(sessionCookie, "Docs");

        String jobId = startOwnedAudit(sessionCookie, "https://example.com/docs", projectSlug);
        awaitVerifiedReport(sessionCookie, jobId);

        restTestClient.get()
                .uri("/account/projects/{slug}/urls", projectSlug)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(1);
                    Map<String, Object> trackedUrl = (Map<String, Object>) body.getFirst();
                    assertThat(trackedUrl.get("trackedUrl")).isEqualTo("https://example.com/docs");
                    assertThat(trackedUrl.get("auditCount")).isEqualTo(1);
                });
    }

    @Test
    void projectFilteredAuditHistoryIncludesProjectMetadata() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String attachedJobId = startOwnedAudit(sessionCookie, "https://example.com/docs");
        String unassignedJobId = startOwnedAudit(sessionCookie, "https://example.com/blog");
        awaitVerifiedReport(sessionCookie, attachedJobId);
        awaitVerifiedReport(sessionCookie, unassignedJobId);

        String projectSlug = createProject(sessionCookie, "Docs");
        attachAudit(sessionCookie, projectSlug, attachedJobId);

        restTestClient.get()
                .uri("/account/audits?projectSlug={projectSlug}", projectSlug)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(1);
                    Map<String, Object> audit = (Map<String, Object>) body.getFirst();
                    assertThat(audit.get("jobId")).isEqualTo(attachedJobId);
                    assertThat(audit.get("projectSlug")).isEqualTo(projectSlug);
                    assertThat(audit.get("trackedUrl")).isEqualTo("https://example.com/docs");
                });
    }

    @Test
    void projectCanContainAuditsFromDifferentDomains() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String firstJobId = startOwnedAudit(sessionCookie, "https://example.com/blog");
        String secondJobId = startOwnedAudit(sessionCookie, "https://linkedin.com/company/example");
        awaitVerifiedReport(sessionCookie, firstJobId);
        awaitVerifiedReport(sessionCookie, secondJobId);

        String projectSlug = createProject(sessionCookie, "Mixed Portfolio");
        attachAudit(sessionCookie, projectSlug, firstJobId);
        attachAudit(sessionCookie, projectSlug, secondJobId);

        restTestClient.get()
                .uri("/account/projects/{slug}/urls", projectSlug)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(2);
                    assertThat(body)
                            .extracting(item -> ((Map<String, Object>) item).get("trackedUrl"))
                            .containsExactlyInAnyOrder(
                                    "https://example.com/blog",
                                    "https://linkedin.com/company/example"
                            );
                });
    }

    @Test
    void sameNormalizedUrlCanExistInDifferentProjectsWithSeparateHistories() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String docsSlug = createProject(sessionCookie, "Docs");
        String marketingSlug = createProject(sessionCookie, "Marketing");

        String docsJobId = startOwnedAudit(sessionCookie, "https://example.com/pricing", docsSlug);
        String marketingJobId = startOwnedAudit(sessionCookie, "https://example.com/pricing", marketingSlug);
        awaitVerifiedReport(sessionCookie, docsJobId);
        awaitVerifiedReport(sessionCookie, marketingJobId);

        assertProjectUrlCount(sessionCookie, docsSlug, 1, 1);
        assertProjectUrlCount(sessionCookie, marketingSlug, 1, 1);
    }

    @Test
    void deletingLastAuditRemovesTrackedUrlAndReportAccess() throws InterruptedException {
        String sessionCookie = registerAndVerify("owner@example.com", "CorrectHorse1!");
        String projectSlug = createProject(sessionCookie, "Docs");
        String jobId = startOwnedAudit(sessionCookie, "https://example.com/docs", projectSlug);
        awaitVerifiedReport(sessionCookie, jobId);

        deleteAudit(sessionCookie, projectSlug, jobId);

        assertProjectUrlCount(sessionCookie, projectSlug, 0, 0);
        restTestClient.get()
                .uri("/audits/{jobId}/report", jobId)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isNotFound();
    }

    private String registerAndVerify(String email, String password) {
        AuthUserEntity user = new AuthUserEntity();
        user.setId(UUID.randomUUID());
        user.setEmailOriginal(email);
        user.setEmailNormalized(email.toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setEnabled(true);
        user.setEmailVerifiedAt(OffsetDateTime.now());
        user.setFailedLoginCount(0);
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());
        authUserRepository.save(user);

        CsrfState csrf = fetchCsrfState();
        var loginResult = restTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, csrf.cookie())
                .body(Map.of("email", email, "password", password))
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        return extractCookie(loginResult.getResponseHeaders(), "seogeo_session");
    }

    private String startOwnedAudit(String sessionCookie, String url) {
        return startOwnedAudit(sessionCookie, url, null);
    }

    private String startOwnedAudit(String sessionCookie, String url, String projectSlug) {
        Map<String, Object> responseBody = restTestClient.post()
                .uri("/audits")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .body(projectSlug == null ? Map.of("url", url) : Map.of(
                        "url", url,
                        "projectSlug", projectSlug
                ))
                .exchange()
                .expectStatus().isAccepted()
                .returnResult(Map.class)
                .getResponseBody();
        return String.valueOf(responseBody.get("jobId"));
    }

    private void awaitVerifiedReport(String sessionCookie, String jobId) throws InterruptedException {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(8));
        while (Instant.now().isBefore(deadline)) {
            var reportResult = restTestClient.get()
                    .uri("/audits/{jobId}/report", jobId)
                    .header(HttpHeaders.COOKIE, sessionCookie)
                    .exchange()
                    .returnResult(AuditReportSchema.class);
            if (reportResult.getStatus().value() == 200 && reportResult.getResponseBody() != null) {
                return;
            }
            Thread.sleep(200);
        }
        throw new AssertionError("Timed out waiting for verified report " + jobId);
    }

    private String createProject(String sessionCookie, String name) {
        CsrfState csrf = fetchCsrfState(sessionCookie);
        Map<String, Object> responseBody = restTestClient.post()
                .uri("/account/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, combineCookies(sessionCookie, csrf.cookie()))
                .body(Map.of(
                        "name", name,
                        "description", "Project notes"
                ))
                .exchange()
                .expectStatus().isCreated()
                .returnResult(Map.class)
                .getResponseBody();
        return String.valueOf(responseBody.get("slug"));
    }

    private void attachAudit(String sessionCookie, String slug, String jobId) {
        CsrfState csrf = fetchCsrfState(sessionCookie);
        restTestClient.post()
                .uri("/account/projects/{slug}/audits/{jobId}", slug, jobId)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, combineCookies(sessionCookie, csrf.cookie()))
                .exchange()
                .expectStatus().isOk();
    }

    private void deleteAudit(String sessionCookie, String slug, String jobId) {
        CsrfState csrf = fetchCsrfState(sessionCookie);
        restTestClient.delete()
                .uri("/account/projects/{slug}/audits/{jobId}", slug, jobId)
                .header("X-XSRF-TOKEN", csrf.token())
                .header(HttpHeaders.COOKIE, combineCookies(sessionCookie, csrf.cookie()))
                .exchange()
                .expectStatus().isNoContent();
    }

    private void assertProjectUrlCount(String sessionCookie, String projectSlug, int trackedUrlCount, int auditCount) {
        restTestClient.get()
                .uri("/account/projects/{slug}/urls", projectSlug)
                .header(HttpHeaders.COOKIE, sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .expectBody(List.class)
                .value(body -> {
                    assertThat(body).hasSize(trackedUrlCount);
                    if (trackedUrlCount > 0) {
                        Map<String, Object> trackedUrl = (Map<String, Object>) body.getFirst();
                        assertThat(trackedUrl.get("auditCount")).isEqualTo(auditCount);
                    }
                });
    }

    private Map<String, Object> findProject(List<?> body, String slug) {
        return body.stream()
                .map(item -> (Map<String, Object>) item)
                .filter(project -> slug.equals(project.get("slug")))
                .findFirst()
                .orElseThrow();
    }

    private CsrfState fetchCsrfState() {
        return fetchCsrfState(null);
    }

    private CsrfState fetchCsrfState(String sessionCookie) {
        var csrfResult = restTestClient.get()
                .uri("/auth/csrf")
                .header(HttpHeaders.COOKIE, sessionCookie == null ? "" : sessionCookie)
                .exchange()
                .expectStatus().isOk()
                .returnResult(Map.class);

        Map<String, Object> body = csrfResult.getResponseBody();
        String cookie = extractCookie(csrfResult.getResponseHeaders(), "XSRF-TOKEN");
        return new CsrfState(body.get("token").toString(), cookie);
    }

    private String extractCookie(HttpHeaders headers, String cookieName) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotNull();
        return cookies.stream()
                .map(cookie -> cookie.split(";", 2)[0])
                .filter(cookie -> cookie.startsWith(cookieName + "="))
                .reduce((first, second) -> second)
                .orElseThrow();
    }

    private static String combineCookies(String... cookies) {
        return String.join("; ", cookies);
    }

    private record CsrfState(String token, String cookie) {
    }
}
