import test from "node:test";
import assert from "node:assert/strict";
import { deriveFacts } from "./deriveFacts.js";

test("deriveFacts creates reusable facts from collected evidence", () => {
  const facts = deriveFacts({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    xRobotsTag: "googlebot: noindex",
    title: "  Hello World  ",
    metaDescription: "",
    canonicalUrl: "https://example.com/",
    h1Count: 2,
    lang: "en",
    robotsContent: "noindex,follow",
    openGraphTitle: "",
    openGraphDescription: "Social summary",
    wordCount: 42,
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
        href: "/learn-more",
        resolvedHref: "https://example.com/learn-more",
        sameOrigin: true,
        crawlable: true,
        text: "Read more",
        usesJavascriptHref: false,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
      {
        href: "#details",
        resolvedHref: "https://example.com/#details",
        sameOrigin: true,
        crawlable: false,
        text: "Jump to details",
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
    structuredDataKinds: ["json-ld", "microdata"],
    redirectChain: {
      status: "ok",
      totalRedirects: 1,
      finalUrlChanged: true,
      finalUrl: "https://example.com/",
      chain: [
        {
          url: "https://example.com",
          statusCode: 301,
          location: "https://example.com/",
        },
        {
          url: "https://example.com/",
          statusCode: 200,
          location: null,
        },
      ],
    },
    robotsTxt: {
      status: "blocked",
      allowsCrawl: false,
      evaluatedUserAgent: "Googlebot",
      matchedDirective: "disallow",
      matchedPattern: "/",
      fetchStatusCode: 200,
      url: "https://example.com/robots.txt",
      finalUrl: "https://example.com/robots.txt",
    },
  });

  assert.equal(facts.hasTitle, true);
  assert.equal(facts.titleLength, 11);
  assert.equal(facts.hasMetaDescription, false);
  assert.equal(facts.hasCanonicalUrl, true);
  assert.equal(facts.hasPrimaryHeading, true);
  assert.equal(facts.blocksIndexing, true);
  assert.equal(facts.blocksIndexingViaHeader, true);
  assert.equal(facts.hasSocialPreview, true);
  assert.equal(facts.isReachable, true);
  assert.equal(facts.isHtmlResponse, true);
  assert.equal(facts.sourceWordCount, 42);
  assert.equal(facts.sameOriginCrawlableLinkCount, 2);
  assert.equal(facts.nonCrawlableLinkCount, 2);
  assert.equal(facts.emptyAnchorTextCount, 1);
  assert.equal(facts.genericAnchorTextCount, 1);
  assert.equal(facts.linkedImageCount, 1);
  assert.equal(facts.linkedImageMissingAltCount, 1);
  assert.deepEqual(facts.structuredDataKinds, ["json-ld", "microdata"]);
  assert.equal(facts.robotsTxtStatus, "blocked");
  assert.equal(facts.robotsTxtAllowsCrawl, false);
  assert.equal(facts.redirectCount, 1);
  assert.equal(facts.canonicalConsistency, "self");
});
