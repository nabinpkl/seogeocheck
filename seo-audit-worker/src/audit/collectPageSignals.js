import { normalizeText } from "../rules/utils.js";
import {
  buildAnchorRecord,
  buildLinkedImageRecord,
  countWords,
  normalizeHref,
} from "./signalUtils.js";

function readNamedMeta($, name) {
  const value = $(`meta[name="${name}"]`).attr("content");
  return normalizeText(value);
}

function readPropertyMeta($, property) {
  const value = $(`meta[property="${property}"]`).attr("content");
  return normalizeText(value);
}

function readNamedMetaValues($, name) {
  return $(`meta[name="${name}"]`)
    .toArray()
    .map((element) => normalizeText($(element).attr("content")))
    .filter(Boolean);
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
  const finalUrl = request.loadedUrl ?? request.url;
  const metaRobotsTags = readNamedMetaValues($, "robots");
  const googlebotRobotsTags = readNamedMetaValues($, "googlebot");
  const htmlCanonicalLinks = collectCanonicalLinks($);
  const htmlAlternateLinks = collectAlternateLinks($);

  return {
    requestedUrl,
    finalUrl,
    statusCode: response?.statusCode ?? null,
    contentType: response?.headers?.["content-type"] ?? null,
    title: $("title").first().text(),
    metaDescription: readNamedMeta($, "description"),
    canonicalUrl: htmlCanonicalLinks[0]?.href ?? null,
    h1Count: $("h1").length,
    lang: $("html").attr("lang") ?? null,
    robotsContent: metaRobotsTags[0] ?? null,
    metaRobotsTags,
    googlebotRobotsTags,
    openGraphTitle: readPropertyMeta($, "og:title"),
    openGraphDescription: readPropertyMeta($, "og:description"),
    wordCount: countWords($("body").text()),
    sourceAnchors: collectSourceAnchors($, finalUrl),
    linkedImages: collectLinkedImages($, finalUrl),
    structuredDataKinds: collectStructuredDataKinds($),
    structuredDataJsonLdBlocks: collectStructuredDataJsonLdBlocks($),
    htmlCanonicalLinks,
    htmlAlternateLinks,
    xRobotsTag: preflight.xRobotsTag ?? null,
    xRobotsTagHeaders: preflight.xRobotsTagHeaders ?? [],
    headerCanonicalLinks: preflight.headerCanonicalLinks ?? [],
    headerAlternateLinks: preflight.headerAlternateLinks ?? [],
    redirectChain: preflight.redirectChain ?? null,
    robotsTxt: preflight.robotsTxt ?? null,
    canonicalTargetInspection: preflight.canonicalTargetInspection ?? null,
  };
}

export const collectPageSignals = collectSourceHtmlSignals;
