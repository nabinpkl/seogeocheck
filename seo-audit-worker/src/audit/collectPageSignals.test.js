import test from "node:test";
import assert from "node:assert/strict";
import { collectPageSignals } from "./collectPageSignals.js";

function createElement(type, options = {}) {
  return {
    type,
    attrs: options.attrs ?? {},
    textValue: options.textValue ?? "",
    children: options.children ?? [],
  };
}

function createCollection(elements, document) {
  return {
    get length() {
      return elements.length;
    },
    first() {
      return createCollection(elements.slice(0, 1), document);
    },
    attr(name) {
      return elements[0]?.attrs?.[name];
    },
    text() {
      return elements.map((element) => element.textValue ?? "").join(" ");
    },
    toArray() {
      return elements;
    },
    find(selector) {
      if (selector !== "img") {
        throw new Error(`Unsupported nested selector in test stub: ${selector}`);
      }

      const matches = elements.flatMap((element) => element.children?.filter((child) => child.type === "img") ?? []);
      return createCollection(matches, document);
    },
  };
}

function createCheerioStub(document) {
  return (selector) => {
    if (typeof selector !== "string") {
      return createCollection([selector], document);
    }

    switch (selector) {
      case "title":
        return createCollection([createElement("title", { textValue: document.title ?? "" })], document);
      case 'meta[name="description"]':
        return createCollection(
          [createElement("meta", { attrs: { content: document.metaDescription ?? undefined } })],
          document
        );
      case 'meta[name="robots"]':
        return createCollection(
          [createElement("meta", { attrs: { content: document.robotsContent ?? undefined } })],
          document
        );
      case 'meta[property="og:title"]':
        return createCollection(
          [createElement("meta", { attrs: { content: document.openGraphTitle ?? undefined } })],
          document
        );
      case 'meta[property="og:description"]':
        return createCollection(
          [createElement("meta", { attrs: { content: document.openGraphDescription ?? undefined } })],
          document
        );
      case 'link[rel="canonical"]':
        return createCollection(
          [createElement("link", { attrs: { href: document.canonicalUrl ?? undefined } })],
          document
        );
      case "h1":
        return createCollection(
          Array.from({ length: document.h1Count ?? 0 }, () => createElement("h1")),
          document
        );
      case "html":
        return createCollection(
          [createElement("html", { attrs: { lang: document.lang ?? undefined } })],
          document
        );
      case "body":
        return createCollection([createElement("body", { textValue: document.bodyText ?? "" })], document);
      case "a":
        return createCollection(document.anchors ?? [], document);
      case 'script[type="application/ld+json"]':
        return createCollection(
          document.structuredDataKinds?.includes("json-ld") ? [createElement("script")] : [],
          document
        );
      case "[itemscope]":
        return createCollection(
          document.structuredDataKinds?.includes("microdata") ? [createElement("microdata")] : [],
          document
        );
      case "[id]":
        return createCollection(
          (document.fragmentTargets ?? []).map(() => createElement("target")),
          document
        );
      case "[name]":
        return createCollection(
          (document.fragmentTargets ?? []).map(() => createElement("target")),
          document
        );
      case "[typeof]":
        return createCollection(
          document.structuredDataKinds?.includes("rdfa") ? [createElement("rdfa")] : [],
          document
        );
      default:
        if (selector.startsWith("#")) {
          const fragmentId = selector.slice(1);
          return createCollection(
            document.fragmentTargets?.includes(fragmentId) ? [createElement("target")] : [],
            document
          );
        }
        if (selector.startsWith('[id="') && selector.endsWith('"]')) {
          const fragmentId = selector.slice(5, -2);
          return createCollection(
            document.fragmentTargets?.includes(fragmentId) ? [createElement("target")] : [],
            document
          );
        }
        if (selector.startsWith('[name="') && selector.endsWith('"]')) {
          const fragmentId = selector.slice(7, -2);
          return createCollection(
            document.fragmentTargets?.includes(fragmentId) ? [createElement("target")] : [],
            document
          );
        }
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
      anchors: [],
      structuredDataKinds: [],
      fragmentTargets: [],
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
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    xRobotsTag: null,
    redirectChain: null,
    robotsTxt: null,
  });
});

test("collectPageSignals inventories source anchors, linked images, structured data kinds, and preflight evidence", () => {
  const result = collectPageSignals({
    requestedUrl: "https://example.com/start",
    request: {
      url: "https://example.com/start",
      loadedUrl: "https://example.com/final",
    },
    response: {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
    $: createCheerioStub({
      title: "Example",
      metaDescription: "Useful summary",
      canonicalUrl: "/canonical",
      h1Count: 1,
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Example",
      openGraphDescription: "Useful summary",
      bodyText: "Body copy lives here",
      fragmentTargets: ["details"],
      structuredDataKinds: ["json-ld", "microdata"],
      anchors: [
        createElement("a", {
          attrs: { href: "/products" },
          textValue: "Products",
        }),
        createElement("a", {
          attrs: { href: "javascript:void(0)" },
          textValue: "Open menu",
        }),
        createElement("a", {
          attrs: { href: "#details" },
          textValue: "Jump to details",
        }),
        createElement("a", {
          attrs: { href: "/gallery" },
          children: [createElement("img", { attrs: { alt: "" } })],
        }),
        createElement("a", {
          attrs: { href: "/learn-more" },
          textValue: "Read more",
        }),
      ],
    }),
    preflight: {
      xRobotsTag: "all",
      redirectChain: {
        status: "ok",
        totalRedirects: 1,
        finalUrlChanged: true,
        finalUrl: "https://example.com/final",
        chain: [
          {
            url: "https://example.com/start",
            statusCode: 301,
            location: "https://example.com/final",
          },
          {
            url: "https://example.com/final",
            statusCode: 200,
            location: null,
          },
        ],
      },
      robotsTxt: {
        status: "allowed",
        allowsCrawl: true,
        evaluatedUserAgent: "Googlebot",
        matchedDirective: "allow",
        matchedPattern: "/",
        fetchStatusCode: 200,
        url: "https://example.com/robots.txt",
        finalUrl: "https://example.com/robots.txt",
      },
    },
  });

  assert.equal(result.sourceAnchors.length, 5);
  assert.deepEqual(result.sourceAnchors[0], {
    href: "/products",
    resolvedHref: "https://example.com/products",
    sameOrigin: true,
    crawlable: true,
    text: "Products",
    usesJavascriptHref: false,
    isFragmentOnly: false,
    hasMatchingFragmentTarget: false,
  });
  assert.deepEqual(result.sourceAnchors[1], {
    href: "javascript:void(0)",
    resolvedHref: null,
    sameOrigin: false,
    crawlable: false,
    text: "Open menu",
    usesJavascriptHref: true,
    isFragmentOnly: false,
    hasMatchingFragmentTarget: false,
  });
  assert.deepEqual(result.sourceAnchors[2], {
    href: "#details",
    resolvedHref: "https://example.com/final#details",
    sameOrigin: true,
    crawlable: false,
    text: "Jump to details",
    usesJavascriptHref: false,
    isFragmentOnly: true,
    hasMatchingFragmentTarget: true,
  });
  assert.deepEqual(result.linkedImages, [
    {
      href: "/gallery",
      resolvedHref: "https://example.com/gallery",
      alt: null,
    },
  ]);
  assert.deepEqual(result.structuredDataKinds, ["json-ld", "microdata"]);
  assert.equal(result.xRobotsTag, "all");
  assert.equal(result.redirectChain.totalRedirects, 1);
  assert.equal(result.robotsTxt.evaluatedUserAgent, "Googlebot");
});
