import test from "node:test";
import assert from "node:assert/strict";
import { collectPageSignals } from "./collectPageSignals.js";

function createCheerioStub(document) {
  return (selector) => {
    switch (selector) {
      case "title":
        return {
          first: () => ({
            text: () => document.title ?? "",
          }),
        };
      case 'meta[name="description"]':
        return {
          attr: (name) => (name === "content" ? document.metaDescription ?? undefined : undefined),
        };
      case 'meta[name="robots"]':
        return {
          attr: (name) => (name === "content" ? document.robotsContent ?? undefined : undefined),
        };
      case 'meta[property="og:title"]':
        return {
          attr: (name) => (name === "content" ? document.openGraphTitle ?? undefined : undefined),
        };
      case 'meta[property="og:description"]':
        return {
          attr: (name) => (name === "content" ? document.openGraphDescription ?? undefined : undefined),
        };
      case 'link[rel="canonical"]':
        return {
          attr: (name) => (name === "href" ? document.canonicalUrl ?? undefined : undefined),
        };
      case "h1":
        return {
          length: document.h1Count ?? 0,
        };
      case "html":
        return {
          attr: (name) => (name === "lang" ? document.lang ?? undefined : undefined),
        };
      case "body":
        return {
          text: () => document.bodyText ?? "",
        };
      default:
        throw new Error(`Unsupported selector in test stub: ${selector}`);
    }
  };
}

test("collectPageSignals extracts normalized page evidence from crawl inputs", () => {
  const result = collectPageSignals({
    requestedUrl: "https://example.com",
    request: {
      url: "https://example.com",
      loadedUrl: "https://example.com/",
    },
    response: {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
    $: createCheerioStub({
      title: "  Hello   World  ",
      metaDescription: " Useful summary ",
      canonicalUrl: "https://example.com/",
      h1Count: 2,
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Hello",
      openGraphDescription: "World",
      bodyText: "One two three four",
    }),
  });

  assert.deepEqual(result, {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "  Hello   World  ",
    metaDescription: "Useful summary",
    canonicalUrl: "https://example.com/",
    h1Count: 2,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "Hello",
    openGraphDescription: "World",
    wordCount: 4,
  });
});
