import { normalizeText } from "../rules/utils.js";

function readNamedMeta($, name) {
  const value = $(`meta[name="${name}"]`).attr("content");
  return normalizeText(value);
}

function readPropertyMeta($, property) {
  const value = $(`meta[property="${property}"]`).attr("content");
  return normalizeText(value);
}

function countWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}

export function collectPageSignals({ requestedUrl, request, response, $ }) {
  return {
    requestedUrl,
    finalUrl: request.loadedUrl ?? request.url,
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
  };
}
