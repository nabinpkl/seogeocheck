import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeoAuditResult } from "./normalize.js";

test("normalizeSeoAuditResult maps core SEO findings into scored checks", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "",
    metaDescription: "",
    canonicalUrl: "https://example.com/",
    h1Count: 2,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "",
    openGraphDescription: "Useful summary",
    wordCount: 120,
    contentType: "text/html; charset=utf-8",
  });

  assert.equal(result.finalUrl, "https://example.com/");
  assert.equal(result.checks.length, 8);
  assert.equal(result.categoryScores.metadata, 33);
  assert.equal(result.categoryScores.contentQuality, 50);
  assert.equal(result.categoryScores.crawlability, 100);
  assert.equal(result.score, 61);
  assert.equal(result.checks[0].status, "issue");
  assert.equal(result.checks[0].id, "document-title");
  assert.match(result.checks[0].instruction, /title/i);
  assert.equal(result.checks.at(-1).status, "passed");
});
