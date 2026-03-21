import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalControl,
  buildCanonicalTargetControl,
  buildFaviconControl,
  buildHeadingControl,
  buildHeadHygieneControl,
  buildMetaDescriptionControl,
  buildRobotsControl,
  buildRobotsPreviewControl,
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

test("heading control distinguishes missing, single, and multiple H1 states", () => {
  assert.equal(buildHeadingControl(0).status, "missing");
  assert.equal(buildHeadingControl(1).status, "single");
  assert.equal(buildHeadingControl(2).status, "multiple");
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
