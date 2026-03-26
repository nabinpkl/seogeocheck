import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBodyImageAltControl,
  buildCanonicalControl,
  buildCanonicalSelfReferenceControl,
  buildCanonicalTargetControl,
  buildFaviconControl,
  buildHeadingControl,
  buildHeadingQualityControl,
  buildHeadHygieneControl,
  buildInternalLinkCoverageControl,
  buildLangControl,
  buildMetadataAlignmentControl,
  buildMetaDescriptionControl,
  buildMetaRefreshControl,
  buildRobotsControl,
  buildRobotsPreviewControl,
  buildSocialUrlControl,
  buildSocialMetadataControl,
  buildStructuredDataControl,
  buildTitleControl,
  buildViewportControl,
} from "./controlBuilders.js";

test("title and meta controls enforce shared threshold boundaries", () => {
  assert.equal(buildTitleControl("Short title").status, "too_short");
  assert.equal(buildTitleControl("A sufficiently descriptive source title").status, "good");
  assert.equal(buildTitleControl("A".repeat(61)).status, "too_long");

  assert.equal(buildMetaDescriptionControl("Too short").status, "too_short");
  assert.equal(
    buildMetaDescriptionControl("A meta description that is long enough to clear the lower boundary.").status,
    "good"
  );
  assert.equal(buildMetaDescriptionControl("A".repeat(161)).status, "too_long");
});

test("heading control distinguishes missing, single, multiple, and skipped heading states", () => {
  assert.equal(buildHeadingControl(0).status, "missing");
  assert.equal(buildHeadingControl(1, [{ level: 1, text: "Main" }]).status, "single");
  assert.equal(buildHeadingControl(2, [{ level: 1, text: "Main" }]).status, "multiple");

  const skipped = buildHeadingControl(1, [
    { level: 1, text: "Main" },
    { level: 3, text: "Jumped heading" },
  ]);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.skippedTransitions, [
    {
      fromLevel: 1,
      toLevel: 3,
      expectedNextLevel: 2,
      headingText: "Jumped heading",
    },
  ]);
});

test("body image alt control excludes decorative and tracking images but keeps meaningful images in scope", () => {
  const control = buildBodyImageAltControl([
    {
      src: "/hero.jpg",
      resolvedSrc: "https://example.com/hero.jpg",
      alt: null,
      hasUsableSrc: true,
      isExplicitlyDecorative: false,
      isTrackingPixel: false,
    },
    {
      src: "/decorative-divider.svg",
      resolvedSrc: "https://example.com/decorative-divider.svg",
      alt: null,
      hasUsableSrc: true,
      isExplicitlyDecorative: true,
      isTrackingPixel: false,
    },
    {
      src: "/tracking/pixel.gif",
      resolvedSrc: "https://example.com/tracking/pixel.gif",
      alt: null,
      hasUsableSrc: true,
      isExplicitlyDecorative: false,
      isTrackingPixel: true,
    },
  ]);

  assert.equal(control.status, "missing_alt");
  assert.equal(control.eligibleImageCount, 1);
  assert.equal(control.missingAltCount, 1);
  assert.equal(control.excludedDecorativeCount, 1);
  assert.equal(control.excludedTrackingPixelCount, 1);
});

test("lang control accepts valid BCP 47 tags and rejects invalid or placeholder values", () => {
  assert.equal(buildLangControl(null).status, "missing");
  assert.equal(buildLangControl("en").status, "valid");
  assert.equal(buildLangControl("en-us").canonicalValue, "en-US");
  assert.equal(buildLangControl("x-default").status, "invalid");
  assert.equal(buildLangControl("unknown").status, "invalid");
  assert.equal(buildLangControl("en_US").status, "invalid");
});

test("meta refresh control classifies immediate, timed, refresh-only, and malformed tags", () => {
  const immediate = buildMetaRefreshControl(["0; url=/next"], "https://example.com/page");
  assert.equal(immediate.status, "immediate_redirect");
  assert.equal(immediate.entries[0].resolvedTargetUrl, "https://example.com/next");

  const timed = buildMetaRefreshControl(["5; url=https://example.com/slow"], "https://example.com/page");
  assert.equal(timed.status, "timed_redirect");

  const refreshOnly = buildMetaRefreshControl(["10"], "https://example.com/page");
  assert.equal(refreshOnly.status, "refresh_only");

  const malformed = buildMetaRefreshControl(["refresh now"], "https://example.com/page");
  assert.equal(malformed.status, "malformed");
});

test("structured data control inventories valid, invalid, empty, and incomplete JSON-LD blocks", () => {
  const control = buildStructuredDataControl([
    '{"@context":"https://schema.org","@type":"WebPage"}',
    '{"@context":"https://schema.org"}',
    "",
    "{broken",
  ]);

  assert.equal(control.totalJsonLdBlocks, 4);
  assert.equal(control.validJsonLdBlocks, 1);
  assert.equal(control.missingTypeBlocks, 1);
  assert.equal(control.emptyJsonLdBlocks, 1);
  assert.equal(control.invalidJsonLdBlocks, 1);
  assert.equal(control.status, "invalid");
});

test("canonical target control classifies reachable, redirected, and blocked canonical targets", () => {
  const canonicalControl = buildCanonicalControl(
    [{ href: "https://example.com/canonical", rel: "canonical" }],
    [],
    "https://example.com/page",
    "https://example.com/page"
  );

  const healthy = buildCanonicalTargetControl({
    canonicalControl,
    pageFinalUrl: "https://example.com/page",
    canonicalTargetInspection: {
      inspectedUrl: "https://example.com/canonical",
      status: "ok",
      finalUrl: "https://example.com/canonical",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      metaRobotsTags: ["index,follow"],
      googlebotRobotsTags: [],
      xRobotsTagHeaders: [],
      redirectChain: {
        status: "ok",
        totalRedirects: 0,
        finalUrlChanged: false,
        finalUrl: "https://example.com/canonical",
        chain: [],
      },
      robotsTxt: {
        status: "allowed",
        allowsCrawl: true,
      },
    },
  });
  assert.equal(healthy.status, "healthy");

  const redirected = buildCanonicalTargetControl({
    canonicalControl,
    pageFinalUrl: "https://example.com/page",
    canonicalTargetInspection: {
      inspectedUrl: "https://example.com/canonical",
      status: "ok",
      finalUrl: "https://example.com/final-canonical",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      metaRobotsTags: ["index,follow"],
      googlebotRobotsTags: [],
      xRobotsTagHeaders: [],
      redirectChain: {
        status: "ok",
        totalRedirects: 1,
        finalUrlChanged: true,
        finalUrl: "https://example.com/final-canonical",
        chain: [],
      },
      robotsTxt: {
        status: "allowed",
        allowsCrawl: true,
      },
    },
  });
  assert.equal(redirected.status, "redirected");

  const blocked = buildCanonicalTargetControl({
    canonicalControl,
    pageFinalUrl: "https://example.com/page",
    canonicalTargetInspection: {
      inspectedUrl: "https://example.com/canonical",
      status: "ok",
      finalUrl: "https://example.com/canonical",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      metaRobotsTags: ["noindex"],
      googlebotRobotsTags: [],
      xRobotsTagHeaders: [],
      redirectChain: {
        status: "ok",
        totalRedirects: 0,
        finalUrlChanged: false,
        finalUrl: "https://example.com/canonical",
        chain: [],
      },
      robotsTxt: {
        status: "allowed",
        allowsCrawl: true,
      },
    },
  });
  assert.equal(blocked.status, "blocked_by_robots_directives");
});

test("social metadata control inventories complete and incomplete Open Graph and Twitter sets", () => {
  const incomplete = buildSocialMetadataControl({
    openGraphTitle: "Example",
    openGraphDescription: "Description",
    openGraphType: "website",
    openGraphUrl: null,
    openGraphImage: null,
    twitterCard: "summary_large_image",
    twitterTitle: "Example",
    twitterDescription: "Description",
    twitterImage: null,
    duplicateHeadCounts: {
      openGraphTitle: 2,
      twitterTitle: 1,
    },
  });

  assert.equal(incomplete.status, "incomplete");
  assert.deepEqual(incomplete.openGraph.missingFields, ["url", "image"]);
  assert.deepEqual(incomplete.twitter.missingFields, ["image"]);
  assert.deepEqual(incomplete.openGraph.duplicateFields, [{ field: "title", count: 2 }]);

  const complete = buildSocialMetadataControl({
    openGraphTitle: "Example",
    openGraphDescription: "Description",
    openGraphType: "website",
    openGraphUrl: "https://example.com",
    openGraphImage: "https://example.com/og.jpg",
    twitterCard: "summary_large_image",
    twitterTitle: "Example",
    twitterDescription: "Description",
    twitterImage: "https://example.com/twitter.jpg",
    duplicateHeadCounts: {},
  });
  assert.equal(complete.status, "complete");
});

test("social url control validates explicit HTTP(S) URLs without duplicating missing-field handling", () => {
  const issues = buildSocialUrlControl({
    openGraphUrl: "/relative-page",
    openGraphImage: "ftp://example.com/image.png",
    twitterImage: "#preview",
    baseUrl: "https://example.com/page",
  });

  assert.equal(issues.status, "issues");
  assert.deepEqual(
    issues.invalidFields.map((field) => [field.field, field.status]),
    [
      ["openGraphUrl", "relative"],
      ["openGraphImage", "non_http"],
      ["twitterImage", "fragment_only"],
    ]
  );

  const clear = buildSocialUrlControl({
    openGraphUrl: "https://example.com/page",
    openGraphImage: "https://example.com/image.png",
    twitterImage: "https://example.com/twitter.png",
    baseUrl: "https://example.com/page",
  });
  assert.equal(clear.status, "clear");
});

test("metadata alignment control catches title-H1 mismatch and weak meta description overlap", () => {
  const mismatch = buildMetadataAlignmentControl({
    title: "Buy running shoes online",
    metaDescription: "Compare performance trainers for marathon runners.",
    headingOutline: [{ level: 1, text: "Kitchen cabinet installation guide" }],
  });
  assert.equal(mismatch.status, "title_h1_and_meta_description_mismatch");
  assert.equal(mismatch.titleH1Mismatch, true);
  assert.equal(mismatch.weakMetaDescriptionAlignment, true);

  const aligned = buildMetadataAlignmentControl({
    title: "Technical SEO checklist for e-commerce category pages",
    metaDescription: "Use this technical SEO checklist to improve category-page indexing, crawling, and on-page signals.",
    headingOutline: [{ level: 1, text: "Technical SEO checklist for category pages" }],
  });
  assert.equal(aligned.status, "aligned");
});

test("internal link coverage control applies only to content-rich pages and uses fixed thresholds", () => {
  assert.equal(
    buildInternalLinkCoverageControl({
      isReachable: true,
      isHtmlResponse: true,
      sourceWordCount: 80,
      sameOriginCrawlableLinkCount: 2,
    }).status,
    "not_applicable"
  );
  assert.equal(
    buildInternalLinkCoverageControl({
      isReachable: true,
      isHtmlResponse: true,
      sourceWordCount: 150,
      sameOriginCrawlableLinkCount: 0,
    }).status,
    "handled_by_baseline"
  );
  assert.equal(
    buildInternalLinkCoverageControl({
      isReachable: true,
      isHtmlResponse: true,
      sourceWordCount: 150,
      sameOriginCrawlableLinkCount: 2,
    }).status,
    "low_coverage"
  );
  assert.equal(
    buildInternalLinkCoverageControl({
      isReachable: true,
      isHtmlResponse: true,
      sourceWordCount: 150,
      sameOriginCrawlableLinkCount: 3,
    }).status,
    "good"
  );
});

test("heading quality control flags empty, repeated, and first-non-H1 outlines", () => {
  const issues = buildHeadingQualityControl([
    { level: 2, text: "Overview" },
    { level: 3, text: "" },
    { level: 3, text: "Overview" },
  ]);

  assert.equal(issues.status, "issues");
  assert.equal(issues.firstHeadingNotH1, true);
  assert.equal(issues.emptyHeadingCount, 1);
  assert.equal(issues.repeatedHeadingCount, 1);
});

test("robots preview control summarizes restrictive and conflicting preview directives", () => {
  const restrictive = buildRobotsPreviewControl(
    buildRobotsControl(["max-snippet: 120, max-image-preview: standard"], [], [])
  );
  assert.equal(restrictive.status, "restrictive");
  assert.deepEqual(restrictive.restrictiveSignals, [
    "max-snippet:120",
    "max-image-preview:standard",
  ]);

  const conflict = buildRobotsPreviewControl(buildRobotsControl(["snippet, nosnippet"], [], []));
  assert.equal(conflict.status, "conflict");
});

test("robots control carries advisory directives through general and crawler-specific overrides", () => {
  const inherited = buildRobotsControl(["noarchive"], ["noindex"], []);
  assert.equal(inherited.hasNoarchiveDirective, true);
  assert.equal(inherited.effectiveArchive, "noarchive");
  assert.equal(inherited.hasNotranslateDirective, false);

  const targeted = buildRobotsControl(["index,follow"], ["notranslate"], []);
  assert.equal(targeted.hasNotranslateDirective, true);
  assert.equal(targeted.effectiveTranslate, "notranslate");
});

test("canonical self-reference control only expects a self-canonical for eligible indexable pages", () => {
  const canonicalControl = buildCanonicalControl(
    [{ href: "https://example.com/page", rel: "canonical" }],
    [],
    "https://example.com/page",
    "https://example.com/page"
  );

  const applicable = buildCanonicalSelfReferenceControl({
    canonicalControl,
    finalUrl: "https://example.com/page",
    isReachable: true,
    isHtmlResponse: true,
    robotsControl: buildRobotsControl(["index,follow"], [], []),
  });
  assert.equal(applicable.status, "self");
  assert.equal(applicable.expectsSelfReference, true);

  const blocked = buildCanonicalSelfReferenceControl({
    canonicalControl: buildCanonicalControl([], [], "https://example.com/page", "https://example.com/page"),
    finalUrl: "https://example.com/page",
    isReachable: true,
    isHtmlResponse: true,
    robotsControl: buildRobotsControl(["noindex"], [], []),
  });
  assert.equal(blocked.status, "not_applicable");
  assert.equal(blocked.expectsSelfReference, false);
});

test("viewport, favicon, and head hygiene controls classify basic source-head quality states", () => {
  assert.equal(buildViewportControl(null).status, "missing");
  assert.equal(
    buildViewportControl("width=device-width, initial-scale=1").status,
    "valid"
  );
  assert.equal(
    buildViewportControl("initial-scale=1, user-scalable=no").status,
    "invalid_or_unfriendly"
  );

  assert.equal(buildFaviconControl([]).status, "missing");
  assert.equal(
    buildFaviconControl([{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }]).status,
    "present"
  );

  const headHygiene = buildHeadHygieneControl({
    title: 2,
    metaDescription: 1,
    viewport: 2,
    openGraphTitle: 1,
    twitterCard: 3,
  });
  assert.equal(headHygiene.status, "duplicates_present");
  assert.deepEqual(headHygiene.problematicFields, [
    { field: "title", count: 2 },
    { field: "viewport", count: 2 },
    { field: "twitterCard", count: 3 },
  ]);
});
