import test from "node:test";
import assert from "node:assert/strict";
import {
  collectSitewideSignals,
  discoverSitewideContext,
} from "./collectSitewideSignals.js";

function createResponse(url, { status = 200, headers = {}, body = "" } = {}) {
  const response = new Response(body, {
    status,
    headers,
  });

  Object.defineProperty(response, "url", {
    value: url,
  });

  return response;
}

function createFetch(routes) {
  return async (url) => {
    const resolvedUrl = typeof url === "string" ? url : url.toString();
    const route = routes.get(resolvedUrl);

    if (!route) {
      throw new Error(`Unexpected fetch for ${resolvedUrl}`);
    }

    return createResponse(route.finalUrl ?? resolvedUrl, route);
  };
}

test("discoverSitewideContext parses sitemap indexes and filters non-html or cross-origin URLs", async () => {
  const fetch = createFetch(
    new Map([
      [
        "https://example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "http://example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "https://www.example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "http://www.example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "https://example.com/robots.txt",
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
        },
      ],
      [
        "http://example.com/robots.txt",
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "User-agent: *\nAllow: /",
        },
      ],
      [
        "https://www.example.com/robots.txt",
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "User-agent: *\nAllow: /",
        },
      ],
      [
        "http://www.example.com/robots.txt",
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "User-agent: *\nAllow: /",
        },
      ],
      [
        "https://example.com/sitemap.xml",
        {
          status: 200,
          headers: { "content-type": "application/xml" },
          body: `<?xml version="1.0" encoding="UTF-8"?>
            <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
              <sitemap><loc>https://external.example.net/sitemap.xml</loc></sitemap>
            </sitemapindex>`,
        },
      ],
      [
        "https://example.com/sitemap-pages.xml",
        {
          status: 200,
          headers: { "content-type": "application/xml" },
          body: `<?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/</loc></url>
              <url><loc>https://example.com/pricing</loc></url>
              <url><loc>https://example.com/logo.svg</loc></url>
              <url><loc>https://external.example.net/blog</loc></url>
            </urlset>`,
        },
      ],
    ])
  );

  const discovery = await discoverSitewideContext(
    {
      finalUrl: "https://example.com/products",
      currentPageSourceAnchors: [],
    },
    fetch
  );

  assert.equal(discovery.siteRootUrl, "https://example.com/");
  assert.equal(discovery.sitemap.discoveryMethod, "robots_txt");
  assert.equal(discovery.sitemap.processedSitemapCount, 2);
  assert.deepEqual(discovery.sitemap.discoveredUrls, [
    "https://example.com/",
    "https://example.com/pricing",
  ]);
});

test("collectSitewideSignals falls back to homepage links and deduplicates the 5-url sample", async () => {
  const fetch = createFetch(
    new Map([
      [
        "https://example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: `
            <html>
              <head>
                <title>Home</title>
                <meta name="description" content="Homepage summary" />
                <link rel="canonical" href="https://example.com/" />
              </head>
              <body>
                <a href="/products">Products</a>
                <a href="/pricing">Pricing</a>
                <a href="/blog">Blog</a>
                <a href="/pricing">Pricing Again</a>
                <a href="/logo.svg">Logo</a>
              </body>
            </html>
          `,
        },
      ],
      [
        "http://example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "https://www.example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "http://www.example.com/",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<html><head><title>Home</title></head><body>Home</body></html>",
        },
      ],
      [
        "https://example.com/robots.txt",
        {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "",
        },
      ],
      [
        "http://example.com/robots.txt",
        {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "",
        },
      ],
      [
        "https://www.example.com/robots.txt",
        {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "",
        },
      ],
      [
        "http://www.example.com/robots.txt",
        {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: "",
        },
      ],
      [
        "https://example.com/sitemap.xml",
        {
          status: 404,
          headers: { "content-type": "application/xml" },
          body: "",
        },
      ],
      [
        "https://example.com/products",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: `
            <html>
              <head>
                <title>Products</title>
                <meta name="description" content="Products summary" />
                <link rel="canonical" href="https://example.com/products" />
              </head>
              <body>Products</body>
            </html>
          `,
        },
      ],
      [
        "https://example.com/pricing",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: `
            <html>
              <head>
                <title>Pricing</title>
                <meta name="description" content="Pricing summary" />
                <link rel="canonical" href="https://example.com/pricing" />
              </head>
              <body>Pricing</body>
            </html>
          `,
        },
      ],
      [
        "https://example.com/blog",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: `
            <html>
              <head>
                <title>Blog</title>
                <meta name="description" content="Blog summary" />
                <link rel="canonical" href="https://example.com/blog" />
              </head>
              <body>Blog</body>
            </html>
          `,
        },
      ],
      [
        "https://example.com/contact",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: `
            <html>
              <head>
                <title>Contact</title>
                <meta name="description" content="Contact summary" />
                <link rel="canonical" href="https://example.com/contact" />
              </head>
              <body>Contact</body>
            </html>
          `,
        },
      ],
    ])
  );

  const discovery = await discoverSitewideContext(
    {
      finalUrl: "https://example.com/contact",
      currentPageSourceAnchors: [],
    },
    fetch
  );
  const sitewide = await collectSitewideSignals(
    {
      currentPageFinalUrl: "https://example.com/contact",
      discovery,
    },
    fetch
  );

  assert.deepEqual(
    sitewide.sampledUrls.map((sample) => sample.url),
    [
      "https://example.com/",
      "https://example.com/contact",
      "https://example.com/products",
      "https://example.com/pricing",
      "https://example.com/blog",
    ]
  );
  assert.equal(sitewide.sampleCoverage.sampledUrlCount, 5);
  assert.equal(sitewide.sampleCoverage.indexableCoverageRatio, 1);
  assert.equal(sitewide.sitemap.discoveryMethod, "none");
});
