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

export function collectSourceHtmlSignals({ requestedUrl, request, response, $, preflight = {} }) {
  const finalUrl = request.loadedUrl ?? request.url;

  return {
    requestedUrl,
    finalUrl,
    statusCode: response?.statusCode ?? null,
    contentType: response?.headers?.["content-type"] ?? null,
    title: $("title").first().text(),
    metaDescription: readNamedMeta($, "description"),
    canonicalUrl: $('link[rel="canonical"]').attr("href") ?? null,
    h1Count: $("h1").length,
    lang: $("html").attr("lang") ?? null,
    robotsContent: readNamedMeta($, "robots"),
    openGraphTitle: readPropertyMeta($, "og:title"),
    openGraphDescription: readPropertyMeta($, "og:description"),
    wordCount: countWords($("body").text()),
    sourceAnchors: collectSourceAnchors($, finalUrl),
    linkedImages: collectLinkedImages($, finalUrl),
    structuredDataKinds: collectStructuredDataKinds($),
    xRobotsTag: preflight.xRobotsTag ?? null,
    redirectChain: preflight.redirectChain ?? null,
    robotsTxt: preflight.robotsTxt ?? null,
  };
}

export const collectPageSignals = collectSourceHtmlSignals;
