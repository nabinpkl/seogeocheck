import test from "node:test";
import assert from "node:assert/strict";
import { deriveFacts } from "./deriveFacts.js";

test("deriveFacts creates reusable facts from collected evidence", () => {
  const facts = deriveFacts({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "  Hello World  ",
    metaDescription: "",
    canonicalUrl: "https://example.com/",
    h1Count: 2,
    lang: "en",
    robotsContent: "noindex,follow",
    openGraphTitle: "",
    openGraphDescription: "Social summary",
    wordCount: 42,
  });

  assert.equal(facts.hasTitle, true);
  assert.equal(facts.titleLength, 11);
  assert.equal(facts.hasMetaDescription, false);
  assert.equal(facts.hasCanonicalUrl, true);
  assert.equal(facts.hasSingleH1, false);
  assert.equal(facts.blocksIndexing, true);
  assert.equal(facts.hasSocialPreview, true);
  assert.equal(facts.isReachable, true);
});
