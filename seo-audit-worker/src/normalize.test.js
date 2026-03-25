import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeoAuditResult } from "./normalize.js";

test("normalizeSeoAuditResult maps collected evidence into the new pack scores and sorted checks", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "Home",
    metaDescription: "",
    canonicalUrl: "#top",
    h1Count: 2,
    headingOutline: [
      { level: 1, text: "Home" },
      { level: 3, text: "Skipped section" },
    ],
    bodyImages: [
      {
        src: "/hero.jpg",
        resolvedSrc: "https://example.com/hero.jpg",
        alt: null,
        hasUsableSrc: true,
        isExplicitlyDecorative: false,
        isTrackingPixel: false,
      },
    ],
    lang: "en_US",
    robotsContent: "index,follow,noarchive,notranslate",
    openGraphTitle: "",
    openGraphDescription: "Useful summary",
    wordCount: 12,
    contentType: "text/html; charset=utf-8",
    xRobotsTag: null,
    sourceAnchors: [
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
        href: "#details",
        resolvedHref: "https://example.com/#details",
        sameOrigin: true,
        crawlable: false,
        text: "Read more",
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
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    redirectChain: {
      status: "unavailable",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [],
      error: "redirect preflight unavailable",
    },
    robotsTxt: {
      status: "unavailable",
      allowsCrawl: null,
      evaluatedUserAgent: null,
      matchedDirective: null,
      matchedPattern: null,
      fetchStatusCode: null,
      url: "https://example.com/robots.txt",
      finalUrl: null,
      error: "robots.txt unavailable",
    },
  });

  assert.equal(result.finalUrl, "https://example.com/");
  assert.equal(result.indexabilityVerdict, "Unknown");
  assert.equal(result.checks[0].status, "issue");
  assert.equal(result.checks[0].id, "source-visible-text");
  assert.match(result.checks[0].instruction, /HTML response before rendering/i);
  assert.equal(result.checks[0].metadata?.evidenceSource, "source_html");
  assert.equal(result.checks[0].metadata?.problemFamily, "source-visible-text");
  assert.deepEqual(result.auditDiagnostics.capture.capturePasses, ["source_html"]);
  assert.equal(result.auditDiagnostics.surfaces.sourceHtml.sameOriginCrawlableLinkCount, 0);
  assert.deepEqual(result.auditDiagnostics.analysis.indexabilitySignals.unknownSignals, [
    "robots_txt_unconfirmed",
    "redirect_chain_unconfirmed",
  ]);
  assert.equal(result.auditDiagnostics.controls.canonicalControl.status, "invalid");
  assert.equal(result.auditDiagnostics.controls.canonicalSelfReferenceControl.status, "invalid");
  assert.equal(result.auditDiagnostics.controls.canonicalTargetControl.status, "not_applicable");
  assert.equal(result.auditDiagnostics.controls.titleControl.status, "too_short");
  assert.equal(result.auditDiagnostics.controls.metaDescriptionControl.status, "missing");
  assert.equal(result.auditDiagnostics.controls.headingControl.status, "multiple_and_skipped");
  assert.equal(result.auditDiagnostics.controls.bodyImageAltControl.status, "missing_alt");
  assert.equal(result.auditDiagnostics.controls.langControl.status, "invalid");
  assert.equal(result.auditDiagnostics.controls.socialMetadataControl.status, "incomplete");
  assert.equal(result.auditDiagnostics.controls.robotsPreviewControl.status, "clear");
  assert.equal(result.auditDiagnostics.controls.viewportControl.status, "missing");
  assert.equal(result.auditDiagnostics.controls.faviconControl.status, "missing");
  assert.equal(result.auditDiagnostics.controls.headHygieneControl.status, "clear");
  assert.equal(result.auditDiagnostics.controls.structuredDataControl.status, "none");
  assert.equal(result.auditDiagnostics.controls.robotsControl.status, "clear");
  assert.equal(result.auditDiagnostics.controls.robotsControl.hasNoarchiveDirective, true);
  assert.equal(result.auditDiagnostics.controls.robotsControl.hasNotranslateDirective, true);
  assert.equal(result.scoring.categories.discovery.score, 0);
  assert.equal(result.scoring.categories.discovery.confidence, 0);
  assert.equal(result.auditDiagnostics.surfaces.sourceHtml.headingHierarchySkipCount, 1);
  assert.equal(result.auditDiagnostics.surfaces.sourceHtml.bodyImageMissingAltCount, 1);
  assert.equal(result.checks[0].category, "contentVisibility");
  assert.equal(result.checks.some((check) => check.id === "document-title-quality"), true);
  assert.equal(result.checks.some((check) => check.id === "heading-structure"), true);
  assert.equal(result.checks.some((check) => check.id === "body-image-alt"), true);
  assert.equal(result.checks.some((check) => check.id === "robots-noarchive"), true);
  assert.equal(result.checks.some((check) => check.id === "robots-notranslate"), true);
  assert.equal(result.checks.some((check) => check.id === "canonical-target-health"), true);
  assert.equal(
    result.checks.find((check) => check.id === "canonical-target-health")?.status,
    "not_applicable"
  );
  assert.equal(result.checks.some((check) => check.id === "social-preview-core"), true);
  assert.equal(result.checks.some((check) => check.id === "twitter-preview-core"), true);
  assert.equal(result.checks.some((check) => check.id === "meta-viewport"), true);
  assert.equal(result.checks.some((check) => check.id === "favicon-presence"), true);
  assert.equal(result.checks.some((check) => check.id === "head-duplicate-hygiene"), true);
  assert.equal(
    result.checks.some(
      (check) => check.id === "url-reachable" && check.status === "passed"
    ),
    true
  );
});

test("normalizeSeoAuditResult keeps ideal-state guidance and blocker detail for not applicable checks", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    h1Count: 0,
    headingOutline: [],
    bodyImages: [],
    lang: "",
    robotsContent: "index,follow",
    openGraphTitle: "",
    openGraphDescription: "",
    wordCount: 120,
    contentType: "text/html; charset=utf-8",
    xRobotsTag: null,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [
        {
          url: "https://example.com/",
          statusCode: 200,
          location: null,
        },
      ],
      error: null,
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
      error: null,
    },
  });

  const metaDescriptionQuality = result.checks.find(
    (check) => check.id === "meta-description-quality"
  );
  const documentTitleQuality = result.checks.find(
    (check) => check.id === "document-title-quality"
  );
  const canonicalSignals = result.checks.find((check) => check.id === "canonical-signals");
  const structuredDataPresence = result.checks.find(
    (check) => check.id === "structured-data-presence"
  );
  const internalLinkCoverage = result.checks.find(
    (check) => check.id === "internal-link-coverage"
  );

  assert.equal(metaDescriptionQuality?.status, "not_applicable");
  assert.match(metaDescriptionQuality?.instruction ?? "", /preferred length range/i);
  assert.match(metaDescriptionQuality?.detail ?? "", /needs a meta description/i);

  assert.equal(documentTitleQuality?.status, "not_applicable");
  assert.match(documentTitleQuality?.instruction ?? "", /preferred length range/i);
  assert.match(documentTitleQuality?.detail ?? "", /needs a title/i);

  assert.equal(canonicalSignals?.status, "not_applicable");
  assert.match(canonicalSignals?.instruction ?? "", /one valid canonical target/i);
  assert.match(canonicalSignals?.detail ?? "", /no canonical declaration/i);

  assert.equal(structuredDataPresence?.status, "not_applicable");
  assert.match(structuredDataPresence?.instruction ?? "", /rich results/i);
  assert.match(structuredDataPresence?.detail ?? "", /optional/i);

  assert.equal(internalLinkCoverage?.status, "not_applicable");
  assert.match(internalLinkCoverage?.instruction ?? "", /secondary check should assess/i);
  assert.match(internalLinkCoverage?.detail ?? "", /already covers pages that expose zero/i);
});

test("normalizeSeoAuditResult fills concrete detail for thin issue checks", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "",
    metaDescription: "",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    headingOutline: [{ level: 1, text: "Home" }],
    bodyImages: [],
    lang: "",
    robotsContent: "index,follow",
    openGraphTitle: "Example Home",
    openGraphDescription: "Source summary",
    wordCount: 140,
    contentType: "text/html; charset=utf-8",
    viewportContent: "",
    iconLinks: [],
    xRobotsTag: null,
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
    ],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [
        {
          url: "https://example.com/",
          statusCode: 200,
          location: null,
        },
      ],
      error: null,
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
      error: null,
    },
  });

  assert.match(
    result.checks.find((check) => check.id === "document-title")?.detail ?? "",
    /No <title> element/i
  );
  assert.match(
    result.checks.find((check) => check.id === "meta-description")?.detail ?? "",
    /meta name="description"/i
  );
  assert.match(
    result.checks.find((check) => check.id === "html-lang")?.detail ?? "",
    /No lang attribute/i
  );
  assert.match(
    result.checks.find((check) => check.id === "meta-viewport")?.detail ?? "",
    /meta name="viewport"/i
  );
  assert.match(
    result.checks.find((check) => check.id === "favicon-presence")?.detail ?? "",
    /favicon or apple-touch icon/i
  );
});

test("normalizeSeoAuditResult includes rendered DOM summaries and comparison findings when provided", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "Example Home",
    metaDescription: "Source summary",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    bodyImages: [],
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "Example Home",
    openGraphDescription: "Source summary",
    openGraphType: "website",
    openGraphUrl: "https://example.com/",
    openGraphImage: "https://example.com/source.jpg",
    twitterCard: "summary_large_image",
    twitterTitle: "Example Home",
    twitterDescription: "Source summary",
    twitterImage: "https://example.com/twitter-source.jpg",
    viewportContent: "width=device-width, initial-scale=1",
    wordCount: 120,
    contentType: "text/html; charset=utf-8",
    xRobotsTag: null,
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
    ],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
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
      error: null,
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
      error: null,
    },
    renderedDom: {
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com/",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      xRobotsTag: null,
      title: "Example Home",
      metaDescription: "Rendered summary",
      canonicalUrl: "https://example.com/",
      h1Count: 1,
      bodyImages: [],
      lang: "en",
      robotsContent: "index,follow",
      openGraphTitle: "Example Home",
      openGraphDescription: "Rendered summary",
      openGraphType: "website",
      openGraphUrl: "https://example.com/",
      openGraphImage: "https://example.com/rendered.jpg",
      twitterCard: "summary_large_image",
      twitterTitle: "Example Home",
      twitterDescription: "Rendered summary",
      twitterImage: "https://example.com/twitter-rendered.jpg",
      viewportContent: "width=device-width, initial-scale=1",
      wordCount: 150,
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
      ],
      linkedImages: [],
      structuredDataKinds: ["json-ld"],
      structuredDataJsonLdBlocks: ['{"@context":"https://schema.org","@type":"WebPage"}'],
      iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
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
    },
  });

  assert.equal(result.indexabilityVerdict, "Indexable");
  assert.deepEqual(result.auditDiagnostics.capture.capturePasses, ["source_html", "rendered_dom"]);
  assert.equal(result.auditDiagnostics.surfaces.renderedDom.wordCount, 150);
  assert.equal(result.auditDiagnostics.surfaces.renderedDom.bodyImageCount, 0);
  assert.equal(result.auditDiagnostics.surfaces.renderComparison.renderDependencyRisk, "medium");
  assert.deepEqual(result.auditDiagnostics.analysis.indexabilitySignals.riskSignals, []);
  assert.equal(result.scoring.categories.discovery.score, 98);
  assert.equal(result.scoring.categories.discovery.confidence, 100);
  assert.equal(
    result.checks.some((check) => check.metadata?.evidenceSource === "surface_comparison"),
    true
  );
  assert.equal(
    result.checks.some((check) => check.metadata?.problemFamily === "render_dependency"),
    true
  );
});

test("normalizeSeoAuditResult classifies blocked and at-risk verdicts from indexability signals", () => {
  const blocked = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "Example",
    metaDescription: "Summary",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    lang: "en",
    robotsContent: "index,follow",
    googlebotRobotsTags: ["noindex"],
    wordCount: 120,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    viewportContent: "width=device-width, initial-scale=1",
    iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
    duplicateHeadCounts: {},
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [
        {
          url: "https://example.com/",
          statusCode: 200,
          location: null,
        },
      ],
      error: null,
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
      error: null,
    },
  });

  const atRisk = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/final",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "Example",
    metaDescription: "Summary",
    canonicalUrl: "https://example.com/other",
    h1Count: 1,
    lang: "en",
    robotsContent: "index,follow",
    xRobotsTag: null,
    wordCount: 120,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    viewportContent: "width=device-width, initial-scale=1",
    iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
    duplicateHeadCounts: {},
    redirectChain: {
      status: "ok",
      totalRedirects: 4,
      finalUrlChanged: true,
      finalUrl: "https://example.com/final",
      chain: [
        {
          url: "https://example.com",
          statusCode: 301,
          location: "https://example.com/1",
        },
        {
          url: "https://example.com/1",
          statusCode: 301,
          location: "https://example.com/2",
        },
        {
          url: "https://example.com/2",
          statusCode: 301,
          location: "https://example.com/3",
        },
        {
          url: "https://example.com/3",
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
      error: null,
    },
  });

  assert.equal(blocked.indexabilityVerdict, "Blocked");
  assert.deepEqual(blocked.auditDiagnostics.analysis.indexabilitySignals.blockingSignals, [
    "robots_directives_block_indexing",
  ]);
  assert.equal(atRisk.indexabilityVerdict, "At Risk");
  assert.deepEqual(atRisk.auditDiagnostics.analysis.indexabilitySignals.riskSignals, [
    "canonical_points_to_different_url",
    "redirect_chain_is_long",
  ]);
});

test("normalizeSeoAuditResult groups presence and quality checks into shared scoring families", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "Home",
    metaDescription: "",
    h1Count: 2,
    robotsContent: "index,follow",
    wordCount: 120,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    duplicateHeadCounts: {
      title: 2,
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
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [],
      error: null,
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
      error: null,
    },
  });

  const titleChecks = result.checks.filter(
    (check) => check.id === "document-title" || check.id === "document-title-quality"
  );
  assert.equal(titleChecks.length, 2);
  assert.equal(titleChecks.every((check) => check.metadata?.problemFamily === "document_title"), true);
});

test("normalizeSeoAuditResult keeps advisory robots coverage non-blocking", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    title: "Example title that is descriptive enough",
    metaDescription: "This description is long enough to avoid the short metadata threshold in the audit.",
    canonicalUrl: "https://example.com/",
    h1Count: 1,
    robotsContent: "index,follow,noarchive,notranslate",
    wordCount: 120,
    sourceAnchors: [],
    linkedImages: [],
    structuredDataKinds: [],
    structuredDataJsonLdBlocks: [],
    duplicateHeadCounts: {
      title: 1,
      metaDescription: 1,
      viewport: 2,
      openGraphTitle: 2,
      openGraphDescription: 1,
      openGraphType: 1,
      openGraphUrl: 1,
      openGraphImage: 1,
      twitterCard: 1,
      twitterTitle: 1,
      twitterDescription: 1,
      twitterImage: 1,
    },
    redirectChain: {
      status: "ok",
      totalRedirects: 0,
      finalUrlChanged: false,
      finalUrl: "https://example.com/",
      chain: [],
      error: null,
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
      error: null,
    },
  });

  assert.equal(result.indexabilityVerdict, "Indexable");
  assert.equal(result.checks.some((check) => check.id === "head-duplicate-hygiene"), true);
  assert.equal(result.checks.some((check) => check.id === "meta-viewport"), true);
  assert.equal(result.checks.some((check) => check.id === "robots-noarchive"), true);
  assert.equal(result.checks.some((check) => check.id === "robots-notranslate"), true);
});
