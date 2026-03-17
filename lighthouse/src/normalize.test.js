import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLighthouseResult } from "./normalize.js";

test("normalizeLighthouseResult maps Lighthouse issues into imperative findings", () => {
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
          "document-title": { score: 0, scoreDisplayMode: "binary", title: "Document has a title" },
          "largest-contentful-paint": {
            score: 0.41,
            scoreDisplayMode: "numeric",
            displayValue: "4.2 s",
            title: "Largest Contentful Paint element",
          },
        },
      },
    },
    "https://example.com"
  );

  assert.equal(result.score, 81);
  assert.equal(result.findings.length, 2);
  assert.equal(result.findings[0].severity, "high");
  assert.match(result.findings[0].instruction, /Add a unique <title>/);
  assert.match(result.findings[1].instruction, /Optimize the LCP element/);
});
