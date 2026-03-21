import test from "node:test";
import assert from "node:assert/strict";
import { collectIndexabilityPreflight, evaluateRobotsTxt } from "./indexabilityPreflight.js";

function createResponse(url, status, headers = {}, body = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    headers: new Headers(headers),
    async text() {
      return body;
    },
    body: {
      async cancel() {},
    },
  };
}

test("evaluateRobotsTxt prefers Googlebot rules before wildcard rules", () => {
  const result = evaluateRobotsTxt(
    `
      User-agent: *
      Allow: /

      User-agent: Googlebot
      Disallow: /private
    `,
    "https://example.com/private/report"
  );

  assert.deepEqual(result, {
    status: "blocked",
    allowsCrawl: false,
    evaluatedUserAgent: "Googlebot",
    matchedDirective: "disallow",
    matchedPattern: "/private",
  });
});

test("collectIndexabilityPreflight captures redirects, x-robots-tag, and robots.txt evaluation", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    fetchCalls.push(url);

    if (url === "https://example.com/start") {
      return createResponse(url, 301, {
        location: "/final",
      });
    }

    if (url === "https://example.com/final") {
      return createResponse(url, 200, {
        "x-robots-tag": "all",
        link: '</final>; rel="canonical", </fr>; rel="alternate"; hreflang="fr"',
      });
    }

    if (url === "https://example.com/robots.txt") {
      return createResponse(
        url,
        200,
        {},
        `
          User-agent: *
          Allow: /
        `
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const result = await collectIndexabilityPreflight(
    {
      requestedUrl: "https://example.com/start",
      finalUrl: "https://example.com/final",
    },
    fetchImpl
  );

  assert.equal(fetchCalls.length, 3);
  assert.equal(result.xRobotsTag, "all");
  assert.deepEqual(result.xRobotsTagHeaders, ["all"]);
  assert.deepEqual(result.headerCanonicalLinks, [
    {
      href: "/final",
      rel: "canonical",
      hreflang: null,
      media: null,
      type: null,
    },
  ]);
  assert.deepEqual(result.headerAlternateLinks, [
    {
      href: "/fr",
      rel: "alternate",
      hreflang: "fr",
      media: null,
      type: null,
    },
  ]);
  assert.deepEqual(result.redirectChain, {
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
    error: null,
  });
  assert.deepEqual(result.robotsTxt, {
    status: "allowed",
    allowsCrawl: true,
    evaluatedUserAgent: "*",
    matchedDirective: "allow",
    matchedPattern: "/",
    fetchStatusCode: 200,
    url: "https://example.com/robots.txt",
    finalUrl: "https://example.com/robots.txt",
  });
});
