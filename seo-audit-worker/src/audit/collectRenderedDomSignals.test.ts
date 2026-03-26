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
      metaRobotsTags: ["index,follow"],
      googlebotRobotsTags: ["index,follow"],
      metaRefreshTags: ["5; url=/pricing"],
      h1Count: 1,
      headingOutline: [
        { level: 1, text: "Rendered title" },
        { level: 3, text: "Skipped subheading" },
      ],
      bodyImages: [
        {
          src: "/hero.png",
          alt: "",
          role: null,
          ariaHidden: null,
          width: "1200",
          height: "630",
        },
      ],
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Rendered title",
      openGraphDescription: "Rendered summary",
      bodyText: "Rendered content block",
      htmlCanonicalLinks: [{ href: "/canonical", rel: "canonical", hreflang: null, media: null, type: null }],
      htmlAlternateLinks: [{ href: "/fr", rel: "alternate", hreflang: "fr", media: null, type: null }],
      sourceAnchors: [
        {
          href: "/pricing",
          text: "Pricing",
          rel: "nofollow",
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
  assert.deepEqual(result.metaRefreshTags, ["5; url=/pricing"]);
  assert.deepEqual(result.headingOutline, [
    { level: 1, text: "Rendered title" },
    { level: 3, text: "Skipped subheading" },
  ]);
  assert.deepEqual(result.bodyImages, [
    {
      src: "/hero.png",
      resolvedSrc: "https://example.com/hero.png",
      alt: null,
      role: null,
      ariaHidden: null,
      width: 1200,
      height: 630,
      hasUsableSrc: true,
      isExplicitlyDecorative: false,
      isTrackingPixel: false,
    },
  ]);
  assert.deepEqual(result.metaRobotsTags, ["index,follow"]);
  assert.deepEqual(result.googlebotRobotsTags, ["index,follow"]);
  assert.deepEqual(result.sourceAnchors, [
    {
      href: "/pricing",
      resolvedHref: "https://example.com/pricing",
      sameOrigin: true,
      crawlable: true,
      text: "Pricing",
      relTokens: ["nofollow"],
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
  assert.deepEqual(result.htmlAlternateLinks, [
    {
      href: "/fr",
      rel: "alternate",
      hreflang: "fr",
      media: null,
      type: null,
    },
  ]);
});
