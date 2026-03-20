import { normalizeText } from "./utils.js";

const HTML_CONTENT_TYPE_PATTERN = /^(text\/html|application\/xhtml\+xml)\b/i;
const PLACEHOLDER_TITLES = new Set(["home", "index", "untitled"]);
const GENERIC_ANCHOR_TEXT = new Set(["click here", "read more", "learn more"]);

function normalizeAnchor(anchor) {
  return {
    href: normalizeText(anchor?.href),
    resolvedHref: normalizeText(anchor?.resolvedHref),
    sameOrigin: anchor?.sameOrigin === true,
    crawlable: anchor?.crawlable === true,
    text: normalizeText(anchor?.text),
    usesJavascriptHref: anchor?.usesJavascriptHref === true,
    isFragmentOnly: anchor?.isFragmentOnly === true,
    hasMatchingFragmentTarget: anchor?.hasMatchingFragmentTarget === true,
  };
}

function normalizeLinkedImage(image) {
  return {
    href: normalizeText(image?.href),
    resolvedHref: normalizeText(image?.resolvedHref),
    alt: normalizeText(image?.alt),
  };
}

function normalizeStructuredDataKinds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((kind) => normalizeText(kind)).filter(Boolean))];
}

function normalizeRedirectChain(value) {
  const chain = Array.isArray(value?.chain)
    ? value.chain
        .map((step) => ({
          url: normalizeText(step?.url),
          statusCode: Number.isFinite(step?.statusCode) ? Math.round(step.statusCode) : null,
          location: normalizeText(step?.location),
        }))
        .filter((step) => step.url)
    : [];

  return {
    status: normalizeText(value?.status) ?? "unavailable",
    totalRedirects: Number.isFinite(value?.totalRedirects)
      ? Math.max(0, Math.round(value.totalRedirects))
      : Math.max(0, chain.length - 1),
    finalUrlChanged: value?.finalUrlChanged === true,
    finalUrl: normalizeText(value?.finalUrl),
    chain,
    error: normalizeText(value?.error),
  };
}

function normalizeRobotsTxt(value) {
  return {
    status: normalizeText(value?.status) ?? "unavailable",
    allowsCrawl:
      value?.allowsCrawl === true ? true : value?.allowsCrawl === false ? false : null,
    evaluatedUserAgent: normalizeText(value?.evaluatedUserAgent),
    matchedDirective: normalizeText(value?.matchedDirective),
    matchedPattern: normalizeText(value?.matchedPattern),
    fetchStatusCode: Number.isFinite(value?.fetchStatusCode)
      ? Math.round(value.fetchStatusCode)
      : null,
    url: normalizeText(value?.url),
    finalUrl: normalizeText(value?.finalUrl),
    error: normalizeText(value?.error),
  };
}

function comparableUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function blocksIndexingFromDirectives(value) {
  if (!value) {
    return false;
  }

  return /\b(?:noindex|none)\b/i.test(value);
}

function resolveCanonicalStatus(canonicalUrl, baseUrl) {
  if (!canonicalUrl) {
    return {
      canonicalStatus: "missing",
      resolvedCanonicalUrl: null,
    };
  }

  if (canonicalUrl.startsWith("#")) {
    return {
      canonicalStatus: "fragment-only",
      resolvedCanonicalUrl: null,
    };
  }

  try {
    const resolved = new URL(canonicalUrl, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return {
        canonicalStatus: "non-http",
        resolvedCanonicalUrl: resolved.toString(),
      };
    }

    return {
      canonicalStatus: "valid",
      resolvedCanonicalUrl: resolved.toString(),
    };
  } catch {
    return {
      canonicalStatus: "invalid",
      resolvedCanonicalUrl: null,
    };
  }
}

export function deriveFacts(input) {
  const title = normalizeText(input.title);
  const metaDescription = normalizeText(input.metaDescription);
  const canonicalUrl = normalizeText(input.canonicalUrl);
  const lang = normalizeText(input.lang);
  const robotsContent = normalizeText(input.robotsContent);
  const openGraphTitle = normalizeText(input.openGraphTitle);
  const openGraphDescription = normalizeText(input.openGraphDescription);
  const contentType = normalizeText(input.contentType);
  const xRobotsTag = normalizeText(input.xRobotsTag);
  const h1Count = Number.isFinite(input.h1Count) ? Math.max(0, Math.round(input.h1Count)) : 0;
  const wordCount = Number.isFinite(input.wordCount) ? Math.max(0, Math.round(input.wordCount)) : 0;
  const statusCode = Number.isFinite(input.statusCode) ? Math.round(input.statusCode) : null;
  const sourceAnchors = Array.isArray(input.sourceAnchors) ? input.sourceAnchors.map(normalizeAnchor) : [];
  const linkedImages = Array.isArray(input.linkedImages) ? input.linkedImages.map(normalizeLinkedImage) : [];
  const structuredDataKinds = normalizeStructuredDataKinds(input.structuredDataKinds);
  const redirectChain = normalizeRedirectChain(input.redirectChain);
  const robotsTxt = normalizeRobotsTxt(input.robotsTxt);
  const canonicalDetails = resolveCanonicalStatus(
    canonicalUrl,
    input.finalUrl ?? input.requestedUrl ?? "https://example.com"
  );
  const sameOriginCrawlableLinks = sourceAnchors.filter((anchor) => anchor.sameOrigin && anchor.crawlable);
  const nonCrawlableLinks = sourceAnchors.filter((anchor) => !anchor.crawlable);
  const emptyAnchorTextCount = sourceAnchors.filter((anchor) => !anchor.text).length;
  const genericAnchorTextCount = sourceAnchors.filter(
    (anchor) => anchor.crawlable && anchor.text && GENERIC_ANCHOR_TEXT.has(anchor.text.toLowerCase())
  ).length;
  const finalComparableUrl = comparableUrl(input.finalUrl ?? input.requestedUrl ?? null);
  const canonicalComparableUrl = comparableUrl(canonicalDetails.resolvedCanonicalUrl);
  const canonicalConsistency =
    canonicalDetails.canonicalStatus === "valid" && canonicalComparableUrl && finalComparableUrl
      ? canonicalComparableUrl === finalComparableUrl
        ? "self"
        : "contradicts"
      : "unknown";

  return {
    ...input,
    title,
    metaDescription,
    canonicalUrl,
    lang,
    robotsContent,
    openGraphTitle,
    openGraphDescription,
    contentType,
    xRobotsTag,
    h1Count,
    wordCount,
    statusCode,
    sourceAnchors,
    linkedImages,
    structuredDataKinds,
    redirectChain,
    robotsTxt,
    hasTitle: Boolean(title),
    titleLength: title ? title.length : 0,
    hasPlaceholderTitle: title ? PLACEHOLDER_TITLES.has(title.toLowerCase()) : false,
    hasMetaDescription: Boolean(metaDescription),
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    hasCanonicalUrl: Boolean(canonicalUrl),
    canonicalStatus: canonicalDetails.canonicalStatus,
    resolvedCanonicalUrl: canonicalDetails.resolvedCanonicalUrl,
    hasPrimaryHeading: h1Count > 0,
    hasSingleH1: h1Count === 1,
    hasSocialPreview: Boolean(openGraphTitle || openGraphDescription),
    blocksIndexing: blocksIndexingFromDirectives(robotsContent),
    blocksIndexingViaHeader: blocksIndexingFromDirectives(xRobotsTag),
    isHtmlResponse: contentType ? HTML_CONTENT_TYPE_PATTERN.test(contentType) : false,
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
    sourceWordCount: wordCount,
    sameOriginCrawlableLinkCount: sameOriginCrawlableLinks.length,
    nonCrawlableLinkCount: nonCrawlableLinks.length,
    emptyAnchorTextCount,
    genericAnchorTextCount,
    linkedImageCount: linkedImages.length,
    linkedImageMissingAltCount: linkedImages.filter((image) => !image.alt).length,
    hasStructuredDataInSource: structuredDataKinds.length > 0,
    robotsTxtStatus: robotsTxt.status,
    robotsTxtAllowsCrawl: robotsTxt.allowsCrawl,
    redirectChainStatus: redirectChain.status,
    redirectCount: redirectChain.totalRedirects,
    redirectFinalUrlChanged: redirectChain.finalUrlChanged,
    hasLongRedirectChain: redirectChain.totalRedirects > 2,
    canonicalConsistency,
    canonicalContradictsIndexing: canonicalConsistency === "contradicts",
  };
}
