import test from "node:test";
import assert from "node:assert/strict";
import { sitewideRules } from "./sitewide.js";

function createSitewideSummary(overrides = {}) {
  return {
    siteRootUrl: "https://example.com/",
    preferredOrigin: "https://example.com",
    hostVariants: [
      {
        requestedUrl: "http://example.com/",
        finalUrl: "https://example.com/",
        finalOrigin: "https://example.com",
        status: "ok",
        statusCode: 200,
        redirectCount: 1,
        isReachable: true,
        isHtmlResponse: true,
        robotsTxtAllowsCrawl: true,
        effectiveIndexing: "index",
        error: null,
      },
      {
        requestedUrl: "https://www.example.com/",
        finalUrl: "https://example.com/",
        finalOrigin: "https://example.com",
        status: "ok",
        statusCode: 200,
        redirectCount: 1,
        isReachable: true,
        isHtmlResponse: true,
        robotsTxtAllowsCrawl: true,
        effectiveIndexing: "index",
        error: null,
      },
    ],
    robotsTxt: {
      status: "allowed",
      allowsCrawl: true,
      evaluatedUserAgent: "Googlebot",
      matchedDirective: null,
      matchedPattern: null,
      fetchStatusCode: 200,
      url: "https://example.com/robots.txt",
      finalUrl: "https://example.com/robots.txt",
      error: null,
      declaredSitemapUrls: ["https://example.com/sitemap.xml"],
    },
    sitemap: {
      status: "ok",
      discoveryMethod: "robots_txt",
      declaredSitemapUrls: ["https://example.com/sitemap.xml"],
      fallbackSitemapUrl: "https://example.com/sitemap.xml",
      processedSitemapCount: 1,
      discoveredUrlCount: 2,
      sameOriginUrlCount: 2,
      fetchedSitemaps: [
        {
          url: "https://example.com/sitemap.xml",
          finalUrl: "https://example.com/sitemap.xml",
          statusCode: 200,
          contentType: "application/xml",
          status: "ok",
          kind: "urlset",
          discoveredUrlCount: 2,
          sameOriginUrlCount: 2,
          error: null,
        },
      ],
      discoveredUrls: ["https://example.com/", "https://example.com/pricing"],
    },
    sampledUrls: [
      {
        url: "https://example.com/",
        source: "site_root",
        finalUrl: "https://example.com/",
        status: "ok",
        statusCode: 200,
        redirectCount: 0,
        isReachable: true,
        isHtmlResponse: true,
        robotsTxtAllowsCrawl: true,
        effectiveIndexing: "index",
        indexable: true,
        hasTitle: true,
        hasMetaDescription: true,
        hasValidCanonical: true,
      },
      {
        url: "https://example.com/pricing",
        source: "sitemap",
        finalUrl: "https://example.com/pricing",
        status: "ok",
        statusCode: 200,
        redirectCount: 0,
        isReachable: true,
        isHtmlResponse: true,
        robotsTxtAllowsCrawl: true,
        effectiveIndexing: "index",
        indexable: true,
        hasTitle: true,
        hasMetaDescription: true,
        hasValidCanonical: true,
      },
    ],
    sampleCoverage: {
      sampledUrlCount: 2,
      indexableUrlCount: 2,
      titleCoverageCount: 2,
      metaDescriptionCoverageCount: 2,
      canonicalCoverageCount: 2,
      minimumPassingRatio: 0.8,
      indexableCoverageRatio: 1,
      titleCoverageRatio: 1,
      metaDescriptionCoverageRatio: 1,
      canonicalCoverageRatio: 1,
    },
    sitemapSampleHealth: {
      sampledSitemapUrlCount: 1,
      healthyUrlCount: 1,
      brokenUrlCount: 0,
      redirectedUrlCount: 0,
      noindexUrlCount: 0,
      nonCanonicalUrlCount: 0,
      issueUrls: [],
    },
    discoveryAlignment: {
      sampledSitemapUrlCount: 1,
      sampledDiscoveryUrlCount: 2,
      alignedUrlCount: 1,
      sitemapUrlsMissingInternalDiscovery: [],
      internalUrlsMissingFromSitemap: ["https://example.com/"],
    },
    ...overrides,
  };
}

function getRule(id: string) {
  const rule = sitewideRules.find((entry) => entry.id === id);
  assert.ok(rule, `Missing sitewide rule: ${id}`);
  return rule;
}

test("site host canonicalization flags split preferred origins as high severity", () => {
  const rule = getRule("site-host-canonicalization");
  const result = rule.check(
    createSitewideSummary({
      preferredOrigin: null,
      hostVariants: [
        ...createSitewideSummary().hostVariants,
        {
          requestedUrl: "https://www.example.com/",
          finalUrl: "https://www.example.com/",
          finalOrigin: "https://www.example.com",
          status: "ok",
          statusCode: 200,
          redirectCount: 0,
          isReachable: true,
          isHtmlResponse: true,
          robotsTxtAllowsCrawl: true,
          effectiveIndexing: "index",
          error: null,
        },
      ],
    })
  );

  assert.equal(result.status, "issue");
  assert.equal(result.severity, "high");
});

test("site sample coverage rules escalate at the planned thresholds", () => {
  const indexabilityRule = getRule("site-sample-indexability");
  const basicsRule = getRule("site-sample-basics-coverage");
  const lowCoverageSummary = createSitewideSummary({
    sampleCoverage: {
      sampledUrlCount: 5,
      indexableUrlCount: 2,
      titleCoverageCount: 5,
      metaDescriptionCoverageCount: 3,
      canonicalCoverageCount: 3,
      minimumPassingRatio: 0.8,
      indexableCoverageRatio: 0.4,
      titleCoverageRatio: 1,
      metaDescriptionCoverageRatio: 0.6,
      canonicalCoverageRatio: 0.6,
    },
  });

  const indexabilityResult = indexabilityRule.check(lowCoverageSummary);
  const basicsResult = basicsRule.check(lowCoverageSummary);

  assert.equal(indexabilityResult.status, "issue");
  assert.equal(indexabilityResult.severity, "high");
  assert.equal(basicsResult.status, "issue");
  assert.equal(basicsResult.severity, "low");
});

test("site sitemap URL hygiene flags broken sitemap URLs as high severity", () => {
  const rule = getRule("site-sitemap-url-hygiene");
  const result = rule.check(
    createSitewideSummary({
      sitemapSampleHealth: {
        sampledSitemapUrlCount: 2,
        healthyUrlCount: 0,
        brokenUrlCount: 1,
        redirectedUrlCount: 0,
        noindexUrlCount: 1,
        nonCanonicalUrlCount: 0,
        issueUrls: [
          {
            url: "https://example.com/pricing",
            issueTypes: ["broken", "noindex"],
          },
        ],
      },
    })
  );

  assert.equal(result.status, "issue");
  assert.equal(result.severity, "high");
});

test("site discovery alignment flags major sitemap and internal mismatch", () => {
  const rule = getRule("site-discovery-alignment");
  const result = rule.check(
    createSitewideSummary({
      discoveryAlignment: {
        sampledSitemapUrlCount: 2,
        sampledDiscoveryUrlCount: 2,
        alignedUrlCount: 0,
        sitemapUrlsMissingInternalDiscovery: [
          "https://example.com/pricing",
          "https://example.com/features",
        ],
        internalUrlsMissingFromSitemap: [
          "https://example.com/",
          "https://example.com/blog",
        ],
      },
    })
  );

  assert.equal(result.status, "issue");
  assert.equal(result.severity, "medium");
});
