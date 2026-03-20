import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeoAuditResult } from "./normalize.js";

test("normalizeSeoAuditResult maps collected evidence into the new pack scores and sorted checks", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "Home",
    metaDescription: "",
    canonicalUrl: "#top",
    h1Count: 2,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "",
    openGraphDescription: "Useful summary",
    wordCount: 12,
    contentType: "text/html; charset=utf-8",
    sourceAnchors: [
      {
        href: "javascript:void(0)",
        resolvedHref: null,
        sameOrigin: false,
        crawlable: false,
        text: "",
        usesJavascriptHref: true,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
      {
        href: "#details",
        resolvedHref: "https://example.com/#details",
        sameOrigin: true,
        crawlable: false,
        text: "Read more",
        usesJavascriptHref: false,
        isFragmentOnly: true,
        hasMatchingFragmentTarget: true,
      },
    ],
    linkedImages: [
      {
        href: "/gallery",
        resolvedHref: "https://example.com/gallery",
        alt: null,
      },
    ],
    structuredDataKinds: [],
  });

  assert.equal(result.finalUrl, "https://example.com/");
  assert.equal(result.checks.length, 15);
  assert.deepEqual(result.categoryScores, {
    reachability: 100,
    crawlability: 25,
    indexability: 50,
    contentVisibility: 25,
    metadata: 50,
  });
  assert.equal(result.score, 50);
  assert.equal(result.checks[0].status, "issue");
  assert.equal(result.checks[0].id, "source-visible-text");
  assert.match(result.checks[0].instruction, /HTML response before rendering/i);
  assert.equal(result.checks[0].metadata?.evidenceSource, "source_html");
  assert.deepEqual(result.rawSummary.capturePasses, ["source_html"]);
  assert.equal(result.rawSummary.sourceHtml.sameOriginCrawlableLinkCount, 0);
  assert.equal(result.checks.at(-1).id, "url-reachable");
  assert.equal(result.checks.at(-1).status, "passed");
});

test("normalizeSeoAuditResult includes rendered DOM summaries and comparison findings when provided", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "Example Home",
    metaDescription: "Source summary",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "Example Home",
    openGraphDescription: "Source summary",
    wordCount: 120,
    contentType: "text/html; charset=utf-8",
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
    structuredDataKinds: [],
    renderedDom: {
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com/",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      title: "Example Home",
      metaDescription: "Rendered summary",
      canonicalUrl: "https://example.com/",
      h1Count: 1,
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Example Home",
      openGraphDescription: "Rendered summary",
      wordCount: 150,
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
    },
  });

  assert.deepEqual(result.rawSummary.capturePasses, ["source_html", "rendered_dom"]);
  assert.equal(result.rawSummary.renderedDom.wordCount, 150);
  assert.equal(result.rawSummary.renderComparison.renderDependencyRisk, "medium");
  assert.equal(result.categoryScores.discovery, 0);
  assert.equal(
    result.checks.some((check) => check.metadata?.evidenceSource === "surface_comparison"),
    true
  );
});
