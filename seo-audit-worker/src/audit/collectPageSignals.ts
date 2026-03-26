import { normalizeText } from "../rules/utils.js";
import {
  buildAnchorRecord,
  buildBodyImageRecord,
  buildHeadingRecord,
  buildLinkedImageRecord,
  countWords,
  normalizeHref,
} from "./signalUtils.js";

type PreflightSignals = {
  xRobotsTag?: string | null;
  xRobotsTagHeaders?: string[];
  headerCanonicalLinks?: Array<{
    href?: string | null;
    rel?: string | null;
    hreflang?: string | null;
    media?: string | null;
    type?: string | null;
  }>;
  headerAlternateLinks?: Array<{
    href?: string | null;
    rel?: string | null;
    hreflang?: string | null;
    media?: string | null;
    type?: string | null;
  }>;
  redirectChain?: {
    status?: string;
    totalRedirects?: number;
    finalUrlChanged?: boolean;
    finalUrl?: string | null;
    chain?: Array<{
      url?: string | null;
      statusCode?: number | null;
      location?: string | null;
    }>;
    error?: string | null;
  } | null;
  robotsTxt?: {
    status?: string;
    allowsCrawl?: boolean | null;
    evaluatedUserAgent?: string | null;
    matchedDirective?: string | null;
    matchedPattern?: string | null;
    fetchStatusCode?: number | null;
    url?: string | null;
    finalUrl?: string | null;
    error?: string | null;
  } | null;
  canonicalTargetInspection?: {
    inspectedUrl?: string | null;
    status?: string;
    finalUrl?: string | null;
    statusCode?: number | null;
    contentType?: string | null;
    reusedCurrentPageInspection?: boolean;
  } | null;
};

function readNamedMeta($, name) {
  const value = $(`meta[name="${name}"]`).attr("content");
  return normalizeText(value);
}

function readPropertyMeta($, property) {
  const value = $(`meta[property="${property}"]`).attr("content");
  return normalizeText(value);
}

function readPropertyMetaValues($, property) {
  return $(`meta[property="${property}"]`)
    .toArray()
    .map((element) => normalizeText($(element).attr("content")))
    .filter(Boolean);
}

function readNamedMetaValues($, name) {
  return $(`meta[name="${name}"]`)
    .toArray()
    .map((element) => normalizeText($(element).attr("content")))
    .filter(Boolean);
}

function collectMetaRefreshTags($) {
  return $('meta[http-equiv]')
    .toArray()
    .filter((element) => normalizeText($(element).attr("http-equiv"))?.toLowerCase() === "refresh")
    .map((element) => $(element).attr("content"))
    .filter((value) => typeof value === "string");
}

function collectCanonicalLinks($) {
  return $('link[rel="canonical"]')
    .toArray()
    .map((linkNode) => ({
      href: normalizeHref($(linkNode).attr("href")),
      rel: normalizeText($(linkNode).attr("rel")),
      hreflang: normalizeText($(linkNode).attr("hreflang")),
      media: normalizeText($(linkNode).attr("media")),
      type: normalizeText($(linkNode).attr("type")),
    }))
    .filter((link) => link.href || link.hreflang || link.media || link.type);
}

function collectAlternateLinks($) {
  return $('link[rel~="alternate"]')
    .toArray()
    .map((linkNode) => ({
      href: normalizeHref($(linkNode).attr("href")),
      rel: normalizeText($(linkNode).attr("rel")),
      hreflang: normalizeText($(linkNode).attr("hreflang")),
      media: normalizeText($(linkNode).attr("media")),
      type: normalizeText($(linkNode).attr("type")),
    }))
    .filter((link) => link.href || link.hreflang || link.media || link.type);
}

function collectIconLinks($) {
  return [
    ...$('link[rel~="icon"]')
      .toArray()
      .map((linkNode) => ({
        href: normalizeHref($(linkNode).attr("href")),
        rel: normalizeText($(linkNode).attr("rel")),
        sizes: normalizeText($(linkNode).attr("sizes")),
        type: normalizeText($(linkNode).attr("type")),
      })),
    ...$('link[rel="shortcut icon"]')
      .toArray()
      .map((linkNode) => ({
        href: normalizeHref($(linkNode).attr("href")),
        rel: normalizeText($(linkNode).attr("rel")),
        sizes: normalizeText($(linkNode).attr("sizes")),
        type: normalizeText($(linkNode).attr("type")),
      })),
    ...$('link[rel="apple-touch-icon"]')
      .toArray()
      .map((linkNode) => ({
        href: normalizeHref($(linkNode).attr("href")),
        rel: normalizeText($(linkNode).attr("rel")),
        sizes: normalizeText($(linkNode).attr("sizes")),
        type: normalizeText($(linkNode).attr("type")),
      })),
  ]
    .filter((link) => link.href || link.rel || link.sizes || link.type)
    .filter(
      (link, index, links) =>
        links.findIndex(
          (candidate) =>
            candidate.href === link.href &&
            candidate.rel === link.rel &&
            candidate.sizes === link.sizes &&
            candidate.type === link.type
        ) === index
    );
}

function collectDuplicateHeadCounts($) {
  return {
    title: $("title").length,
    metaDescription: $('meta[name="description"]').length,
    viewport: $('meta[name="viewport"]').length,
    openGraphTitle: $('meta[property="og:title"]').length,
    openGraphDescription: $('meta[property="og:description"]').length,
    openGraphType: $('meta[property="og:type"]').length,
    openGraphUrl: $('meta[property="og:url"]').length,
    openGraphImage: $('meta[property="og:image"]').length,
    twitterCard: $('meta[name="twitter:card"]').length,
    twitterTitle: $('meta[name="twitter:title"]').length,
    twitterDescription: $('meta[name="twitter:description"]').length,
    twitterImage: $('meta[name="twitter:image"]').length,
  };
}

function hasFragmentTarget($, fragmentId) {
  if (!fragmentId) {
    return false;
  }

  const escaped = fragmentId.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return $(`[id="${escaped}"]`).length > 0 || $(`[name="${escaped}"]`).length > 0;
}

function collectSourceAnchors($, baseUrl) {
  return $("a")
    .toArray()
    .map((anchorNode) => {
      const href = normalizeHref($(anchorNode).attr("href"));
      const fragmentTargets =
        href && href.startsWith("#") && hasFragmentTarget($, href.slice(1))
          ? [href.slice(1)]
          : [];

      return buildAnchorRecord(
        {
          href,
          text: $(anchorNode).text(),
          rel: $(anchorNode).attr("rel"),
        },
        baseUrl,
        fragmentTargets
      );
    });
}

function collectLinkedImages($, baseUrl) {
  return $("a")
    .toArray()
    .flatMap((anchorNode) => {
      const anchor = $(anchorNode);
      const href = normalizeHref(anchor.attr("href"));

      return anchor
        .find("img")
        .toArray()
        .map((imageNode) =>
          buildLinkedImageRecord(
            {
              href,
              alt: $(imageNode).attr("alt"),
            },
            baseUrl
          )
        );
    });
}

function collectHeadingOutline($) {
  return $("body h1, body h2, body h3, body h4, body h5, body h6")
    .toArray()
    .map((headingNode) =>
      buildHeadingRecord({
        tagName: headingNode?.tagName ?? headingNode?.name ?? headingNode?.type ?? null,
        text: $(headingNode).text(),
      })
    )
    .filter(Boolean);
}

function collectBodyImages($, baseUrl) {
  return $("body img")
    .toArray()
    .map((imageNode) =>
      buildBodyImageRecord(
        {
          src: $(imageNode).attr("src"),
          alt: $(imageNode).attr("alt"),
          role: $(imageNode).attr("role"),
          ariaHidden: $(imageNode).attr("aria-hidden"),
          width: $(imageNode).attr("width"),
          height: $(imageNode).attr("height"),
        },
        baseUrl
      )
    );
}

function collectStructuredDataKinds($) {
  const kinds = [];

  if ($('script[type="application/ld+json"]').length > 0) {
    kinds.push("json-ld");
  }
  if ($("[itemscope]").length > 0) {
    kinds.push("microdata");
  }
  if ($("[typeof]").length > 0) {
    kinds.push("rdfa");
  }

  return kinds;
}

function collectStructuredDataJsonLdBlocks($) {
  return $('script[type="application/ld+json"]')
    .toArray()
    .map((scriptNode) => $(scriptNode).html() ?? $(scriptNode).text() ?? "")
    .filter((rawBlock) => typeof rawBlock === "string");
}

export function collectSourceHtmlSignals({ requestedUrl, request, response, $, preflight = {} }) {
  const preflightSignals = preflight as PreflightSignals;
  const finalUrl = request.loadedUrl ?? request.url;
  const metaRobotsTags = readNamedMetaValues($, "robots");
  const googlebotRobotsTags = readNamedMetaValues($, "googlebot");
  const htmlCanonicalLinks = collectCanonicalLinks($);
  const htmlAlternateLinks = collectAlternateLinks($);
  const duplicateHeadCounts = collectDuplicateHeadCounts($);
  const metaRefreshTags = collectMetaRefreshTags($);

  return {
    requestedUrl,
    finalUrl,
    statusCode: response?.statusCode ?? null,
    contentType: response?.headers?.["content-type"] ?? null,
    title: $("title").first().text(),
    metaDescription: readNamedMeta($, "description"),
    canonicalUrl: htmlCanonicalLinks[0]?.href ?? null,
    h1Count: $("h1").length,
    headingOutline: collectHeadingOutline($),
    bodyImages: collectBodyImages($, finalUrl),
    lang: $("html").attr("lang") ?? null,
    robotsContent: metaRobotsTags[0] ?? null,
    metaRobotsTags,
    googlebotRobotsTags,
    metaRefreshTags,
    openGraphTitle: readPropertyMeta($, "og:title"),
    openGraphDescription: readPropertyMeta($, "og:description"),
    openGraphType: readPropertyMeta($, "og:type"),
    openGraphUrl: readPropertyMeta($, "og:url"),
    openGraphImage: readPropertyMeta($, "og:image"),
    twitterCard: readNamedMeta($, "twitter:card"),
    twitterTitle: readNamedMeta($, "twitter:title"),
    twitterDescription: readNamedMeta($, "twitter:description"),
    twitterImage: readNamedMeta($, "twitter:image"),
    viewportContent: readNamedMeta($, "viewport"),
    wordCount: countWords($("body").text()),
    sourceAnchors: collectSourceAnchors($, finalUrl),
    linkedImages: collectLinkedImages($, finalUrl),
    structuredDataKinds: collectStructuredDataKinds($),
    structuredDataJsonLdBlocks: collectStructuredDataJsonLdBlocks($),
    iconLinks: collectIconLinks($),
    duplicateHeadCounts,
    openGraphTitleValues: readPropertyMetaValues($, "og:title"),
    openGraphDescriptionValues: readPropertyMetaValues($, "og:description"),
    openGraphTypeValues: readPropertyMetaValues($, "og:type"),
    openGraphUrlValues: readPropertyMetaValues($, "og:url"),
    openGraphImageValues: readPropertyMetaValues($, "og:image"),
    twitterCardValues: readNamedMetaValues($, "twitter:card"),
    twitterTitleValues: readNamedMetaValues($, "twitter:title"),
    twitterDescriptionValues: readNamedMetaValues($, "twitter:description"),
    twitterImageValues: readNamedMetaValues($, "twitter:image"),
    htmlCanonicalLinks,
    htmlAlternateLinks,
    xRobotsTag: preflightSignals.xRobotsTag ?? null,
    xRobotsTagHeaders: preflightSignals.xRobotsTagHeaders ?? [],
    headerCanonicalLinks: preflightSignals.headerCanonicalLinks ?? [],
    headerAlternateLinks: preflightSignals.headerAlternateLinks ?? [],
    redirectChain: preflightSignals.redirectChain ?? null,
    robotsTxt: preflightSignals.robotsTxt ?? null,
    canonicalTargetInspection: preflightSignals.canonicalTargetInspection ?? null,
  };
}

export const collectPageSignals = collectSourceHtmlSignals;
