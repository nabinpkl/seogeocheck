import test from "node:test";
import assert from "node:assert/strict";
import { deriveFacts } from "./deriveFacts.js";

test("deriveFacts creates reusable facts from collected evidence", () => {
  const facts = deriveFacts({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    xRobotsTagHeaders: ["googlebot: noindex"],
    title: "  Hello World  ",
    metaDescription: "",
    htmlCanonicalLinks: [{ href: "https://example.com/", rel: "canonical" }],
    headerCanonicalLinks: [{ href: "https://example.com/", rel: "canonical" }],
    h1Count: 2,
    headingOutline: [
      { level: 1, text: "Hello World" },
      { level: 3, text: "Jumped section" },
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
    ],
    lang: "en",
    metaRobotsTags: ["index,follow,noarchive"],
    googlebotRobotsTags: ["noindex"],
    metaRefreshTags: ["0; url=/next", "broken refresh"],
    openGraphTitle: "",
    openGraphDescription: "Social summary",
    openGraphType: "website",
    openGraphUrl: "https://example.com/",
    openGraphImage: "https://example.com/preview.jpg",
    twitterCard: "summary_large_image",
    twitterTitle: "Hello World",
    twitterDescription: "Twitter summary",
    twitterImage: "https://example.com/twitter.jpg",
    viewportContent: "width=device-width, initial-scale=1",
    wordCount: 42,
    sourceAnchors: [
      {
        href: "/products",
        resolvedHref: "https://example.com/products",
        sameOrigin: true,
        crawlable: true,
        text: "Products",
        relTokens: ["nofollow"],
        usesJavascriptHref: false,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
      {
        href: "javascript:void(0)",
        resolvedHref: null,
        sameOrigin: false,
        crawlable: false,
        text: "",
        relTokens: [],
        usesJavascriptHref: true,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
      {
        href: "/learn-more",
        resolvedHref: "https://example.com/learn-more",
        sameOrigin: true,
        crawlable: true,
        text: "Read more",
        relTokens: [],
        usesJavascriptHref: false,
        isFragmentOnly: false,
        hasMatchingFragmentTarget: false,
      },
      {
        href: "#details",
        resolvedHref: "https://example.com/#details",
        sameOrigin: true,
        crawlable: false,
        text: "Jump to details",
        relTokens: [],
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
    htmlAlternateLinks: [{ href: "https://example.com/fr", rel: "alternate", hreflang: "fr" }],
    headerAlternateLinks: [{ href: "https://example.com/fr", rel: "alternate", hreflang: "fr" }],
    structuredDataKinds: ["json-ld", "microdata"],
    structuredDataJsonLdBlocks: ['{"@context":"https://schema.org","@type":"WebPage"}'],
    iconLinks: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
    duplicateHeadCounts: {
      title: 2,
      metaDescription: 0,
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
    },
    robotsTxt: {
      status: "blocked",
      allowsCrawl: false,
      evaluatedUserAgent: "Googlebot",
      matchedDirective: "disallow",
      matchedPattern: "/",
      fetchStatusCode: 200,
      url: "https://example.com/robots.txt",
      finalUrl: "https://example.com/robots.txt",
    },
    canonicalTargetInspection: {
      inspectedUrl: "https://example.com/target",
      status: "ok",
      finalUrl: "https://example.com/target-final",
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      metaRobotsTags: ["index,follow"],
      googlebotRobotsTags: [],
      xRobotsTagHeaders: [],
      redirectChain: {
        status: "ok",
        totalRedirects: 1,
        finalUrlChanged: true,
        finalUrl: "https://example.com/target-final",
        chain: [
          {
            url: "https://example.com/target",
            statusCode: 301,
            location: "https://example.com/target-final",
          },
          {
            url: "https://example.com/target-final",
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

  assert.equal(facts.hasTitle, true);
  assert.equal(facts.titleLength, 11);
  assert.equal(facts.hasMetaDescription, false);
  assert.equal(facts.hasCanonicalUrl, true);
  assert.equal(facts.hasPrimaryHeading, true);
  assert.equal(facts.blocksIndexing, true);
  assert.equal(facts.blocksIndexingViaHeader, true);
  assert.equal(facts.hasSocialPreview, true);
  assert.equal(facts.isReachable, true);
  assert.equal(facts.isHtmlResponse, true);
  assert.equal(facts.sourceWordCount, 42);
  assert.equal(facts.sameOriginCrawlableLinkCount, 2);
  assert.equal(facts.nonCrawlableLinkCount, 2);
  assert.equal(facts.emptyAnchorTextCount, 1);
  assert.equal(facts.genericAnchorTextCount, 1);
  assert.equal(facts.linkedImageCount, 1);
  assert.equal(facts.linkedImageMissingAltCount, 1);
  assert.equal(facts.metaRefreshTagCount, 2);
  assert.equal(facts.headingOutlineCount, 2);
  assert.equal(facts.headingHierarchySkipCount, 1);
  assert.equal(facts.emptyHeadingCount, 0);
  assert.equal(facts.repeatedHeadingCount, 0);
  assert.equal(facts.bodyImageCount, 2);
  assert.equal(facts.eligibleBodyImageCount, 1);
  assert.equal(facts.bodyImageMissingAltCount, 1);
  assert.deepEqual(facts.structuredDataKinds, ["json-ld", "microdata"]);
  assert.equal(facts.robotsTxtStatus, "blocked");
  assert.equal(facts.robotsTxtAllowsCrawl, false);
  assert.equal(facts.redirectCount, 1);
  assert.equal(facts.canonicalConsistency, "self");
  assert.equal(facts.robotsControl.status, "targeted");
  assert.equal(facts.robotsControl.effectiveIndexing, "noindex");
  assert.equal(facts.robotsControl.targetedOverrides.length, 1);
  assert.equal(facts.canonicalControl.status, "clear");
  assert.equal(facts.titleControl.status, "too_short");
  assert.equal(facts.metaDescriptionControl.status, "missing");
  assert.equal(facts.headingControl.status, "multiple_and_skipped");
  assert.equal(facts.headingQualityControl.status, "good");
  assert.equal(facts.bodyImageAltControl.status, "missing_alt");
  assert.equal(facts.metaRefreshControl.status, "immediate_redirect");
  assert.equal(facts.langControl.status, "valid");
  assert.equal(facts.structuredDataControl.status, "valid");
  assert.equal(facts.socialMetadataControl.status, "incomplete");
  assert.equal(facts.socialUrlControl.status, "clear");
  assert.equal(facts.metadataAlignmentControl.status, "aligned");
  assert.equal(facts.robotsPreviewControl.status, "clear");
  assert.equal(facts.viewportControl.status, "valid");
  assert.equal(facts.faviconControl.status, "present");
  assert.equal(facts.headHygieneControl.status, "duplicates_present");
  assert.equal(facts.canonicalTargetControl.status, "self");
  assert.equal(facts.alternateLanguageControl.status, "present");
  assert.equal(facts.linkDiscoveryControl.internalNofollowCount, 1);
  assert.equal(facts.linkDiscoveryControl.blockedByRelCount, 1);
  assert.equal(facts.internalLinkCoverageControl.status, "not_applicable");
  assert.equal(facts.robotsControl.hasNoarchiveDirective, true);
  assert.equal(facts.canonicalSelfReferenceControl.status, "not_applicable");
});
