import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalControl,
  buildCanonicalTargetControl,
  buildHeadingControl,
  buildMetaDescriptionControl,
  buildStructuredDataControl,
  buildTitleControl,
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
