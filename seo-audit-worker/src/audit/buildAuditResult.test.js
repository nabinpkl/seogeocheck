import test from "node:test";
import assert from "node:assert/strict";
import { buildAuditResult } from "./buildAuditResult.js";

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

test("buildAuditResult compares source and rendered signals and activates discovery findings", () => {
  const result = buildAuditResult({
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

  assert.deepEqual(result.rawSummary.capturePasses, ["source_html", "rendered_dom"]);
  assert.equal(result.indexabilityVerdict, "At Risk");
  assert.equal(result.rawSummary.renderedDom.wordCount, 220);
  assert.equal(result.rawSummary.renderComparison.renderDependencyRisk, "high");
  assert.equal(result.rawSummary.renderComparison.sourceOnlyCriticalIssues, 2);
  assert.equal(result.rawSummary.renderComparison.renderedOnlySignals, 0);
  assert.equal(result.rawSummary.renderComparison.mismatches, 1);
  assert.equal(result.categoryScores.discovery, 0);

  const comparisonChecks = result.checks.filter(
    (check) => check.metadata?.evidenceSource === "surface_comparison"
  );

  assert.equal(comparisonChecks.length, 3);
  assert.equal(comparisonChecks[0].id, "rendered-visible-text");
  assert.equal(comparisonChecks[0].status, "issue");
  assert.match(comparisonChecks[0].instruction, /Google may need rendering/i);
  assert.equal(comparisonChecks.at(-1)?.id, "rendered-meta-description-mismatch");

  const sourceCheck = result.checks.find((check) => check.id === "source-visible-text");
  assert.equal(sourceCheck?.metadata?.evidenceSource, "source_html");
});

test("buildAuditResult returns a partial result when the rendered pass fails", () => {
  const result = buildAuditResult({
    sourceInput: createSourceSignals(),
    renderedError: new Error("Rendered pass timed out after 10000ms"),
  });

  assert.deepEqual(result.rawSummary.capturePasses, ["source_html"]);
  assert.equal(result.indexabilityVerdict, "Indexable");
  assert.equal(result.rawSummary.renderedDom, null);
  assert.equal(result.rawSummary.renderComparison.renderDependencyRisk, "unknown");

  const comparisonWarning = result.checks.find(
    (check) => check.id === "rendered-pass-unavailable"
  );
  assert.equal(comparisonWarning?.status, "issue");
  assert.equal(comparisonWarning?.severity, "low");
  assert.equal(comparisonWarning?.metadata?.evidenceSource, "surface_comparison");
});
