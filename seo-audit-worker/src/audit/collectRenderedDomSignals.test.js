import test from "node:test";
import assert from "node:assert/strict";
import { collectRenderedDomSignals } from "./collectRenderedDomSignals.js";

test("collectRenderedDomSignals waits for settle time and returns rendered signal shape", async () => {
  const calls = [];
  const page = {
    waitForTimeout: async (milliseconds) => {
      calls.push(["waitForTimeout", milliseconds]);
    },
    evaluate: async () => ({
      title: "Rendered title",
      metaDescription: "Rendered summary",
      canonicalUrl: "/canonical",
      h1Count: 1,
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Rendered title",
      openGraphDescription: "Rendered summary",
      bodyText: "Rendered content block",
      sourceAnchors: [
        {
          href: "/pricing",
          text: "Pricing",
        },
      ],
      linkedImages: [
        {
          href: "/pricing",
          alt: "Pricing diagram",
        },
      ],
      structuredDataKinds: ["json-ld"],
    }),
  };

  const result = await collectRenderedDomSignals({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    response: {
      status: () => 200,
      headers: () => ({ "content-type": "text/html; charset=utf-8" }),
    },
    page,
    settleTimeMs: 1500,
  });

  assert.deepEqual(calls, [["waitForTimeout", 1500]]);
  assert.equal(result.title, "Rendered title");
  assert.equal(result.wordCount, 3);
  assert.deepEqual(result.sourceAnchors, [
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
  ]);
  assert.deepEqual(result.linkedImages, [
    {
      href: "/pricing",
      resolvedHref: "https://example.com/pricing",
      alt: "Pricing diagram",
    },
  ]);
});
