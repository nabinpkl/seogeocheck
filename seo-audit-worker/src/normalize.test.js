import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeoAuditResult } from "./normalize.js";

test("normalizeSeoAuditResult maps collected evidence into the new pack scores and sorted checks", () => {
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
  assert.equal(result.checks.length, 9);
  assert.deepEqual(result.categoryScores, {
    reachability: 100,
    crawlability: 100,
    indexability: 100,
    contentVisibility: 50,
    metadata: 33,
  });
  assert.equal(result.score, 77);
  assert.equal(result.checks[0].status, "issue");
  assert.equal(result.checks[0].id, "document-title");
  assert.match(result.checks[0].instruction, /title/i);
  assert.equal(result.checks.at(-1).id, "url-reachable");
  assert.equal(result.checks.at(-1).status, "passed");
});
