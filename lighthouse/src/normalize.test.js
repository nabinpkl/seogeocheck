import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLighthouseResult } from "./normalize.js";

test("normalizeLighthouseResult maps Lighthouse checks with explicit status", () => {
  const result = normalizeLighthouseResult(
    {
      lhr: {
        finalDisplayedUrl: "https://example.com/",
        fetchTime: "2026-03-16T00:00:00.000Z",
        categories: {
          performance: { score: 0.72 },
          accessibility: { score: 0.93 },
          "best-practices": { score: 0.88 },
          seo: { score: 0.81 },
        },
        audits: {
          "document-title": {
            score: 0,
            scoreDisplayMode: "binary",
            title: "Document has a title",
            description: "The document should include a title element.",
          },
          "meta-description": {
            score: 1,
            scoreDisplayMode: "binary",
            title: "Document has a meta description",
            description: "The page already includes a usable description.",
          },
          "largest-contentful-paint": {
            score: 0.41,
            scoreDisplayMode: "numeric",
            displayValue: "4.2 s",
            title: "Largest Contentful Paint element",
            description: "Largest Contentful Paint marks the render time of the largest image or text block.",
          },
        },
      },
    },
    "https://example.com"
  );

  assert.equal(result.score, 81);
  assert.equal(result.checks.length, 3);
  assert.equal(result.checks[0].status, "issue");
  assert.equal(result.checks[0].label, "Document has a title");
  assert.equal(result.checks[0].severity, "high");
  assert.match(result.checks[0].instruction, /Improve document has a title/i);
  assert.equal(result.checks[1].status, "issue");
  assert.equal(result.checks[1].label, "Largest Contentful Paint element");
  assert.match(result.checks[1].instruction, /Improve largest contentful paint element/i);
  assert.equal(result.checks[2].status, "passed");
  assert.equal(result.checks[2].label, "Document has a meta description");
});
