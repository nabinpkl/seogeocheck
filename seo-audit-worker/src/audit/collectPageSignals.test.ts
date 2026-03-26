import test from "node:test";
import assert from "node:assert/strict";
import { collectPageSignals } from "./collectPageSignals.js";

type TestNode = {
  type: string;
  tagName: string;
  name: string;
  attrs: Record<string, string | null | undefined>;
  textValue: string;
  htmlValue: string | null;
  children: TestNode[];
};

type ElementOptions = {
  tagName?: string;
  name?: string;
  attrs?: Record<string, string | null | undefined>;
  textValue?: string;
  htmlValue?: string | null;
  children?: TestNode[];
};

function createElement(type: string, options: ElementOptions = {}): TestNode {
  return {
    type,
    tagName: options.tagName ?? type,
    name: options.name ?? type,
    attrs: options.attrs ?? {},
    textValue: options.textValue ?? "",
    htmlValue: options.htmlValue ?? null,
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
    html() {
      return elements[0]?.htmlValue ?? null;
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
          (document.metaRobotsTags ?? [document.robotsContent])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="googlebot"]':
        return createCollection(
          (document.googlebotRobotsTags ?? [])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[http-equiv]':
        return createCollection(
          (document.httpEquivMetas ?? []).map((meta) => createElement("meta", { attrs: meta })),
          document
        );
      case 'meta[property="og:title"]':
        return createCollection(
          (document.openGraphTitleValues ?? [document.openGraphTitle])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[property="og:description"]':
        return createCollection(
          (document.openGraphDescriptionValues ?? [document.openGraphDescription])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[property="og:type"]':
        return createCollection(
          (document.openGraphTypeValues ?? [document.openGraphType])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[property="og:url"]':
        return createCollection(
          (document.openGraphUrlValues ?? [document.openGraphUrl])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[property="og:image"]':
        return createCollection(
          (document.openGraphImageValues ?? [document.openGraphImage])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="twitter:card"]':
        return createCollection(
          (document.twitterCardValues ?? [document.twitterCard])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="twitter:title"]':
        return createCollection(
          (document.twitterTitleValues ?? [document.twitterTitle])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="twitter:description"]':
        return createCollection(
          (document.twitterDescriptionValues ?? [document.twitterDescription])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="twitter:image"]':
        return createCollection(
          (document.twitterImageValues ?? [document.twitterImage])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'meta[name="viewport"]':
        return createCollection(
          (document.viewportValues ?? [document.viewportContent])
            .filter(Boolean)
            .map((content) => createElement("meta", { attrs: { content } })),
          document
        );
      case 'link[rel="canonical"]':
        return createCollection(
          (document.htmlCanonicalLinks ?? [{ href: document.canonicalUrl }])
            .filter((link) => link?.href)
            .map((link) => createElement("link", { attrs: { ...link, rel: "canonical" } })),
          document
        );
      case 'link[rel~="icon"]':
        return createCollection(
          (document.iconLinks ?? [])
            .filter((link) => link.rel?.split(/\s+/).includes("icon"))
            .map((link) => createElement("link", { attrs: link })),
          document
        );
      case 'link[rel="shortcut icon"]':
        return createCollection(
          (document.iconLinks ?? [])
            .filter((link) => link.rel === "shortcut icon")
            .map((link) => createElement("link", { attrs: link })),
          document
        );
      case 'link[rel="apple-touch-icon"]':
        return createCollection(
          (document.iconLinks ?? [])
            .filter((link) => link.rel === "apple-touch-icon")
            .map((link) => createElement("link", { attrs: link })),
          document
        );
      case 'link[rel~="alternate"]':
        return createCollection(
          (document.htmlAlternateLinks ?? []).map((link) =>
            createElement("link", { attrs: { ...link, rel: link.rel ?? "alternate" } })
          ),
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
      case "body img":
        return createCollection(document.bodyImages ?? [], document);
      case "body h1, body h2, body h3, body h4, body h5, body h6":
        return createCollection(document.headingOutline ?? [], document);
      case "a":
        return createCollection(document.anchors ?? [], document);
      case 'script[type="application/ld+json"]':
        return createCollection(
          (document.structuredDataJsonLdBlocks ?? []).map((rawBlock) =>
            createElement("script", { textValue: rawBlock, htmlValue: rawBlock })
          ),
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
      htmlCanonicalLinks: [{ href: "https://example.com/" }],
      h1Count: 2,
      lang: "en",
      robotsContent: "index,follow",
      metaRobotsTags: ["index,follow"],
      httpEquivMetas: [{ "http-equiv": "refresh", content: "10; url=/next" }],
      openGraphTitle: "Hello",
      openGraphDescription: "World",
      openGraphType: "website",
      openGraphUrl: "https://example.com/",
      openGraphImage: "https://example.com/og.jpg",
      twitterCard: "summary_large_image",
      twitterTitle: "Hello",
      twitterDescription: "World",
      twitterImage: "https://example.com/twitter.jpg",
      viewportContent: "width=device-width, initial-scale=1",
      bodyText: "One two three four",
      headingOutline: [
        createElement("h1", { textValue: "Main title" }),
        createElement("h3", { textValue: "Jumped heading" }),
      ],
      bodyImages: [
        createElement("img", {
          attrs: {
            src: "/hero.jpg",
            alt: "",
            width: "1200",
            height: "630",
          },
        }),
      ],
      anchors: [],
      structuredDataKinds: [],
      structuredDataJsonLdBlocks: [],
      iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
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
    headingOutline: [
      {
        level: 1,
        text: "Main title",
      },
      {
        level: 3,
        text: "Jumped heading",
      },
    ],
    bodyImages: [
      {
        src: "/hero.jpg",
        resolvedSrc: "https://example.com/hero.jpg",
        alt: null,
        role: null,
        ariaHidden: null,
        width: 1200,
        height: 630,
        hasUsableSrc: true,
        isExplicitlyDecorative: false,
        isTrackingPixel: false,
      },
    ],
    lang: "en",
    robotsContent: "index,follow",
    metaRobotsTags: ["index,follow"],
    googlebotRobotsTags: [],
    metaRefreshTags: ["10; url=/next"],
    openGraphTitle: "Hello",
    openGraphDescription: "World",
    openGraphType: "website",
    openGraphUrl: "https://example.com/",
    openGraphImage: "https://example.com/og.jpg",
    twitterCard: "summary_large_image",
    twitterTitle: "Hello",
    twitterDescription: "World",
    twitterImage: "https://example.com/twitter.jpg",
    viewportContent: "width=device-width, initial-scale=1",
    wordCount: 4,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    iconLinks: [
      {
        href: "/favicon.ico",
        rel: "icon",
        sizes: null,
        type: "image/x-icon",
      },
    ],
    duplicateHeadCounts: {
      title: 1,
      metaDescription: 1,
      viewport: 1,
      openGraphTitle: 1,
      openGraphDescription: 1,
      openGraphType: 1,
      openGraphUrl: 1,
      openGraphImage: 1,
      twitterCard: 1,
      twitterTitle: 1,
      twitterDescription: 1,
      twitterImage: 1,
    },
    openGraphTitleValues: ["Hello"],
    openGraphDescriptionValues: ["World"],
    openGraphTypeValues: ["website"],
    openGraphUrlValues: ["https://example.com/"],
    openGraphImageValues: ["https://example.com/og.jpg"],
    twitterCardValues: ["summary_large_image"],
    twitterTitleValues: ["Hello"],
    twitterDescriptionValues: ["World"],
    twitterImageValues: ["https://example.com/twitter.jpg"],
    htmlCanonicalLinks: [
      {
        href: "https://example.com/",
        rel: "canonical",
        hreflang: null,
        media: null,
        type: null,
      },
    ],
    htmlAlternateLinks: [],
    xRobotsTag: null,
    xRobotsTagHeaders: [],
    headerCanonicalLinks: [],
    headerAlternateLinks: [],
    redirectChain: null,
    robotsTxt: null,
    canonicalTargetInspection: null,
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
      htmlCanonicalLinks: [{ href: "/canonical" }],
      htmlAlternateLinks: [{ href: "/fr", hreflang: "fr", rel: "alternate" }],
      h1Count: 1,
      lang: "en",
      robotsContent: "index,follow",
      metaRobotsTags: ["index,follow"],
      googlebotRobotsTags: ["index,follow"],
      httpEquivMetas: [
        { "http-equiv": "refresh", content: "0; url=/redirected" },
        { "http-equiv": "refresh", content: "broken refresh" },
      ],
      openGraphTitle: "Example",
      openGraphDescription: "Useful summary",
      openGraphType: "article",
      openGraphUrl: "https://example.com/final",
      openGraphImage: "https://example.com/preview.jpg",
      twitterCard: "summary_large_image",
      twitterTitle: "Example social",
      twitterDescription: "Useful summary",
      twitterImage: "https://example.com/twitter-preview.jpg",
      viewportContent: "width=device-width, initial-scale=1",
      bodyText: "Body copy lives here",
      fragmentTargets: ["details"],
      headingOutline: [
        createElement("h1", { textValue: "Products" }),
        createElement("h2", { textValue: "Overview" }),
        createElement("h4", { textValue: "Deep jump" }),
      ],
      bodyImages: [
        createElement("img", {
          attrs: {
            src: "/content-photo.jpg",
            alt: "",
            width: "800",
            height: "600",
          },
        }),
        createElement("img", {
          attrs: {
            src: "/tracking/pixel.gif",
            width: "1",
            height: "1",
          },
        }),
        createElement("img", {
          attrs: {
            src: "/decorative-divider.svg",
            alt: "",
            role: "presentation",
          },
        }),
      ],
      structuredDataKinds: ["json-ld", "microdata"],
      structuredDataJsonLdBlocks: ['{"@context":"https://schema.org","@type":"WebPage"}'],
      iconLinks: [
        { href: "/favicon.ico", rel: "icon", type: "image/x-icon" },
        { href: "/apple-touch-icon.png", rel: "apple-touch-icon", sizes: "180x180" },
      ],
      anchors: [
        createElement("a", {
          attrs: { href: "/products", rel: "nofollow" },
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
      xRobotsTagHeaders: ["all"],
      headerCanonicalLinks: [{ href: "https://example.com/final", rel: "canonical" }],
      headerAlternateLinks: [{ href: "https://example.com/fr", rel: "alternate", hreflang: "fr" }],
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
      canonicalTargetInspection: {
        inspectedUrl: "https://example.com/canonical",
        status: "ok",
        finalUrl: "https://example.com/canonical",
        statusCode: 200,
        contentType: "text/html; charset=utf-8",
        metaRobotsTags: [],
        googlebotRobotsTags: [],
        xRobotsTag: null,
        xRobotsTagHeaders: [],
        headerCanonicalLinks: [],
        headerAlternateLinks: [],
        redirectChain: {
          status: "ok",
          totalRedirects: 0,
          finalUrlChanged: false,
          finalUrl: "https://example.com/canonical",
          chain: [
            {
              url: "https://example.com/canonical",
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
    },
  });

  assert.equal(result.sourceAnchors.length, 5);
  assert.deepEqual(result.sourceAnchors[0], {
    href: "/products",
    resolvedHref: "https://example.com/products",
    sameOrigin: true,
    crawlable: true,
    text: "Products",
    relTokens: ["nofollow"],
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
    relTokens: [],
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
    relTokens: [],
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
  assert.deepEqual(result.metaRefreshTags, ["0; url=/redirected", "broken refresh"]);
  assert.deepEqual(result.headingOutline, [
    { level: 1, text: "Products" },
    { level: 2, text: "Overview" },
    { level: 4, text: "Deep jump" },
  ]);
  assert.deepEqual(result.bodyImages, [
    {
      src: "/content-photo.jpg",
      resolvedSrc: "https://example.com/content-photo.jpg",
      alt: null,
      role: null,
      ariaHidden: null,
      width: 800,
      height: 600,
      hasUsableSrc: true,
      isExplicitlyDecorative: false,
      isTrackingPixel: false,
    },
    {
      src: "/tracking/pixel.gif",
      resolvedSrc: "https://example.com/tracking/pixel.gif",
      alt: null,
      role: null,
      ariaHidden: null,
      width: 1,
      height: 1,
      hasUsableSrc: true,
      isExplicitlyDecorative: false,
      isTrackingPixel: true,
    },
    {
      src: "/decorative-divider.svg",
      resolvedSrc: "https://example.com/decorative-divider.svg",
      alt: null,
      role: "presentation",
      ariaHidden: null,
      width: null,
      height: null,
      hasUsableSrc: true,
      isExplicitlyDecorative: true,
      isTrackingPixel: false,
    },
  ]);
  assert.deepEqual(result.structuredDataKinds, ["json-ld", "microdata"]);
  assert.deepEqual(result.structuredDataJsonLdBlocks, [
    '{"@context":"https://schema.org","@type":"WebPage"}',
  ]);
  assert.equal(result.openGraphType, "article");
  assert.equal(result.openGraphUrl, "https://example.com/final");
  assert.equal(result.openGraphImage, "https://example.com/preview.jpg");
  assert.equal(result.twitterCard, "summary_large_image");
  assert.equal(result.twitterTitle, "Example social");
  assert.equal(result.twitterDescription, "Useful summary");
  assert.equal(result.twitterImage, "https://example.com/twitter-preview.jpg");
  assert.equal(result.viewportContent, "width=device-width, initial-scale=1");
  assert.deepEqual(result.iconLinks, [
    {
      href: "/favicon.ico",
      rel: "icon",
      sizes: null,
      type: "image/x-icon",
    },
    {
      href: "/apple-touch-icon.png",
      rel: "apple-touch-icon",
      sizes: "180x180",
      type: null,
    },
  ]);
  assert.deepEqual(result.duplicateHeadCounts, {
    title: 1,
    metaDescription: 1,
    viewport: 1,
    openGraphTitle: 1,
    openGraphDescription: 1,
    openGraphType: 1,
    openGraphUrl: 1,
    openGraphImage: 1,
    twitterCard: 1,
    twitterTitle: 1,
    twitterDescription: 1,
    twitterImage: 1,
  });
  assert.equal(result.xRobotsTag, "all");
  assert.deepEqual(result.xRobotsTagHeaders, ["all"]);
  assert.deepEqual(result.googlebotRobotsTags, ["index,follow"]);
  assert.deepEqual(result.htmlAlternateLinks, [
    {
      href: "/fr",
      rel: "alternate",
      hreflang: "fr",
      media: null,
      type: null,
    },
  ]);
  assert.deepEqual(result.headerCanonicalLinks, [
    {
      href: "https://example.com/final",
      rel: "canonical",
    },
  ]);
  assert.deepEqual(result.headerAlternateLinks, [
    {
      href: "https://example.com/fr",
      rel: "alternate",
      hreflang: "fr",
    },
  ]);
  assert.equal(result.redirectChain.totalRedirects, 1);
  assert.equal(result.robotsTxt.evaluatedUserAgent, "Googlebot");
  assert.equal(result.canonicalTargetInspection.finalUrl, "https://example.com/canonical");
});
