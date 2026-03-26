import test from "node:test";
import assert from "node:assert/strict";
import { collectIndexabilityPreflight, evaluateRobotsTxt, inspectUrl } from "./indexabilityPreflight.js";

function createResponse(
  url: string,
  status: number,
  headers: Record<string, string> = {},
  body = ""
): Response {
  const response = new Response(body, { status, headers });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

function toRequestUrl(input: URL | string | Request): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
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

test("inspectUrl captures redirects, header controls, and head robots metadata", async () => {
  const fetchCalls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = toRequestUrl(input as URL | string | Request);
    fetchCalls.push(url);

    if (url === "https://example.com/start") {
      return createResponse(url, 301, {
        location: "/final",
      });
    }

    if (url === "https://example.com/final") {
      return createResponse(
        url,
        200,
        {
          "content-type": "text/html; charset=utf-8",
          "x-robots-tag": "all",
          link: '</final>; rel="canonical", </fr>; rel="alternate"; hreflang="fr"',
        },
        `
          <html>
            <head>
              <meta name="robots" content="index,follow">
              <meta name="googlebot" content="noindex">
            </head>
          </html>
        `
      );
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

  const result = await inspectUrl("https://example.com/start", fetchImpl);

  assert.equal(fetchCalls.length, 3);
  assert.equal(result.xRobotsTag, "all");
  assert.deepEqual(result.metaRobotsTags, ["index,follow"]);
  assert.deepEqual(result.googlebotRobotsTags, ["noindex"]);
  assert.deepEqual(result.headerCanonicalLinks, [
    {
      href: "/final",
      rel: "canonical",
      hreflang: null,
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

test("collectIndexabilityPreflight reuses current page inspection for a self canonical target", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = toRequestUrl(input as URL | string | Request);
    if (url === "https://example.com/start") {
      return createResponse(
        url,
        200,
        {
          "content-type": "text/html; charset=utf-8",
        },
        `
          <html>
            <head>
              <meta name="robots" content="index,follow">
            </head>
          </html>
        `
      );
    }

    if (url === "https://example.com/robots.txt") {
      return createResponse(url, 200, {}, "User-agent: *\nAllow: /");
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const result = await collectIndexabilityPreflight(
    {
      requestedUrl: "https://example.com/start",
      finalUrl: "https://example.com/start",
      htmlCanonicalLinks: [{ href: "https://example.com/start", rel: "canonical" }],
    },
    fetchImpl
  );

  assert.equal(result.canonicalTargetInspection.reusedCurrentPageInspection, true);
  assert.equal(result.canonicalTargetInspection.finalUrl, "https://example.com/start");
});

test("collectIndexabilityPreflight inspects an external canonical target once", async () => {
  const fetchCalls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = toRequestUrl(input as URL | string | Request);
    fetchCalls.push(url);

    if (url === "https://example.com/page") {
      return createResponse(
        url,
        200,
        {
          "content-type": "text/html; charset=utf-8",
        },
        "<html><head></head></html>"
      );
    }

    if (url === "https://example.com/canonical") {
      return createResponse(
        url,
        200,
        {
          "content-type": "text/html; charset=utf-8",
        },
        `
          <html>
            <head>
              <meta name="robots" content="index,follow">
            </head>
          </html>
        `
      );
    }

    if (url === "https://example.com/robots.txt") {
      return createResponse(url, 200, {}, "User-agent: *\nAllow: /");
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const result = await collectIndexabilityPreflight(
    {
      requestedUrl: "https://example.com/page",
      finalUrl: "https://example.com/page",
      htmlCanonicalLinks: [{ href: "https://example.com/canonical", rel: "canonical" }],
    },
    fetchImpl
  );

  assert.equal(result.canonicalTargetInspection.finalUrl, "https://example.com/canonical");
  assert.equal(result.canonicalTargetInspection.reusedCurrentPageInspection, undefined);
  assert.equal(fetchCalls.filter((url) => url === "https://example.com/canonical").length, 1);
});
