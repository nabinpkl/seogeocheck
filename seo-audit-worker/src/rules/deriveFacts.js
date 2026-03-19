import { normalizeText } from "./utils.js";

export function deriveFacts(input) {
  const title = normalizeText(input.title);
  const metaDescription = normalizeText(input.metaDescription);
  const canonicalUrl = normalizeText(input.canonicalUrl);
  const lang = normalizeText(input.lang);
  const robotsContent = normalizeText(input.robotsContent);
  const openGraphTitle = normalizeText(input.openGraphTitle);
  const openGraphDescription = normalizeText(input.openGraphDescription);
  const h1Count = Number.isFinite(input.h1Count) ? Math.max(0, Math.round(input.h1Count)) : 0;
  const wordCount = Number.isFinite(input.wordCount) ? Math.max(0, Math.round(input.wordCount)) : 0;
  const statusCode = Number.isFinite(input.statusCode) ? Math.round(input.statusCode) : null;

  return {
    ...input,
    title,
    metaDescription,
    canonicalUrl,
    lang,
    robotsContent,
    openGraphTitle,
    openGraphDescription,
    h1Count,
    wordCount,
    statusCode,
    hasTitle: Boolean(title),
    titleLength: title ? title.length : 0,
    hasMetaDescription: Boolean(metaDescription),
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    hasCanonicalUrl: Boolean(canonicalUrl),
    hasSingleH1: h1Count === 1,
    hasSocialPreview: Boolean(openGraphTitle || openGraphDescription),
    blocksIndexing: robotsContent ? /\bnoindex\b/i.test(robotsContent) : false,
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
  };
}
