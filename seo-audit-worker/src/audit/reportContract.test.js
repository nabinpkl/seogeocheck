import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { buildAuditResult } from "./buildAuditResult.js";

const reportSchema = JSON.parse(
  readFileSync(new URL("../../../schemas/audit/audit-report.schema.json", import.meta.url), "utf8")
);

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

const validateReport = ajv.compile(reportSchema);
const rawSummarySchemaKeys = Object.keys(reportSchema.$defs.rawSummary.properties).sort();

function createSourceSignals(overrides = {}) {
  return {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    xRobotsTag: null,
    title: "Example Home",
    metaDescription: "Source summary",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "Example Home",
    openGraphDescription: "Source summary",
    wordCount: 140,
    sourceAnchors: [
      {
        href: "/products",
        resolvedHref: "https://example.com/products",
        sameOrigin: true,
        crawlable: true,
        text: "Products",
        usesJavascriptHref: false,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
    ],
    linkedImages: [],
    structuredDataKinds: ["json-ld"],
    structuredDataJsonLdBlocks: ['{"@context":"https://schema.org","@type":"WebPage"}'],
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [
        {
          url: "https://example.com/",
          statusCode: 200,
          location: null,
        },
      ],
      error: null,
    },
    robotsTxt: {
      status: "allowed",
      allowsCrawl: true,
      evaluatedUserAgent: "Googlebot",
      matchedDirective: "allow",
      matchedPattern: "/",
      fetchStatusCode: 200,
      url: "https://example.com/robots.txt",
      finalUrl: "https://example.com/robots.txt",
      error: null,
    },
    ...overrides,
  };
}

function buildReportEnvelope(jobId, result) {
  const counts = result.checks.reduce(
    (summary, check) => {
      if (check.status === "issue") {
        summary.issueCount += 1;
      } else if (check.status === "passed") {
        summary.passedCheckCount += 1;
      } else if (check.status === "not_applicable") {
        summary.notApplicableCount += 1;
      } else if (check.status === "system_error") {
        summary.systemErrorCount += 1;
      }

      return summary;
    },
    {
      issueCount: 0,
      passedCheckCount: 0,
      notApplicableCount: 0,
      systemErrorCount: 0,
    }
  );

  const targetUrl = result.requestedUrl;

  return {
    jobId,
    status: "VERIFIED",
    generatedAt: "2026-03-24T07:00:00Z",
    targetUrl,
    reportType: "SEO_SIGNALS_SIGNED_AUDIT",
    indexabilityVerdict: result.indexabilityVerdict,
    summary: {
      score: result.score,
      status: "VERIFIED",
      indexabilityVerdict: result.indexabilityVerdict,
      targetUrl,
      ...counts,
      topIssue:
        result.checks.find((check) => check.status === "issue")?.label ?? "No major issues detected",
    },
    checks: result.checks,
    categories: result.categoryScores,
    rawSummary: result.rawSummary,
    signature: {
      present: true,
      algorithm: "HMAC-SHA256",
      value: "deadbeef",
    },
  };
}

function assertValidWrappedReport(jobId, result) {
  const report = buildReportEnvelope(jobId, result);
  const valid = validateReport(report);

  assert.equal(
    valid,
    true,
    `Expected ${jobId} worker result to satisfy audit-report schema: ${ajv.errorsText(
      validateReport.errors,
      {
        separator: "; ",
      }
    )}`
  );
}

test("worker result stays compatible with the shared report schema across major output paths", () => {
  const sourceOnly = buildAuditResult({
    sourceInput: createSourceSignals(),
  });
  const renderedSuccess = buildAuditResult({
    sourceInput: createSourceSignals({
      wordCount: 8,
      sourceAnchors: [],
      title: "Example Home",
    }),
    renderedInput: {
      ...createSourceSignals({
        wordCount: 220,
        sourceAnchors: [
          {
            href: "/products",
            resolvedHref: "https://example.com/products",
            sameOrigin: true,
            crawlable: true,
            text: "Products",
            usesJavascriptHref: false,
            isFragmentOnly: false,
            hasMatchingFragmentTarget: false,
          },
          {
            href: "/pricing",
            resolvedHref: "https://example.com/pricing",
            sameOrigin: true,
            crawlable: true,
            text: "Pricing",
            usesJavascriptHref: false,
            isFragmentOnly: false,
            hasMatchingFragmentTarget: false,
          },
        ],
      }),
      metaDescription: "Rendered summary",
    },
  });
  const renderedError = buildAuditResult({
    sourceInput: createSourceSignals(),
    renderedError: new Error("Rendered pass timed out after 10000ms"),
  });

  assertValidWrappedReport("source_only", sourceOnly);
  assertValidWrappedReport("rendered_success", renderedSuccess);
  assertValidWrappedReport("rendered_error", renderedError);
});

test("worker rawSummary top-level keys stay aligned with the shared report schema", () => {
  const result = buildAuditResult({
    sourceInput: createSourceSignals(),
  });

  assert.deepEqual(Object.keys(result.rawSummary).sort(), rawSummarySchemaKeys);
  assert.equal(result.categoryScores.discovery, 0);
  assert.equal(result.rawSummary.scoring.model, "weighted_rule_scoring");
  assert.equal(typeof result.rawSummary.scoring.overall.confidence, "number");
  assert.equal(Array.isArray(result.rawSummary.scoring.rules), true);
});
