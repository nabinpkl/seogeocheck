import { normalizeText } from "./utils.js";
import {
  buildAlternateLanguageControl,
  buildCanonicalControl,
  buildCanonicalTargetControl,
  buildFaviconControl,
  buildHeadingControl,
  buildHeadHygieneControl,
  buildLinkDiscoveryControl,
  buildMetaDescriptionControl,
  buildRobotsPreviewControl,
  buildRobotsControl,
  buildSocialMetadataControl,
  buildStructuredDataControl,
  buildTitleControl,
  buildViewportControl,
  isHtmlContentType,
  normalizeLinkAnnotations,
  normalizeRedirectChain,
  normalizeRobotsTxt,
  normalizeStructuredDataKinds,
} from "./controlBuilders.js";

const PLACEHOLDER_TITLES = new Set(["home", "index", "untitled"]);
const GENERIC_ANCHOR_TEXT = new Set(["click here", "read more", "learn more"]);

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAnchor(anchor) {
  return {
    href: normalizeText(anchor?.href),
    resolvedHref: normalizeText(anchor?.resolvedHref),
    sameOrigin: anchor?.sameOrigin === true,
    crawlable: anchor?.crawlable === true,
    text: normalizeText(anchor?.text),
    relTokens: uniqueValues(
      Array.isArray(anchor?.relTokens)
        ? anchor.relTokens.map((token) => normalizeText(token)?.toLowerCase())
        : []
    ),
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

export function deriveFacts(input) {
  const title = normalizeText(input.title);
  const metaDescription = normalizeText(input.metaDescription);
  const lang = normalizeText(input.lang);
  const openGraphTitle = normalizeText(input.openGraphTitle);
  const openGraphDescription = normalizeText(input.openGraphDescription);
  const openGraphType = normalizeText(input.openGraphType);
  const openGraphUrl = normalizeText(input.openGraphUrl);
  const openGraphImage = normalizeText(input.openGraphImage);
  const twitterCard = normalizeText(input.twitterCard);
  const twitterTitle = normalizeText(input.twitterTitle);
  const twitterDescription = normalizeText(input.twitterDescription);
  const twitterImage = normalizeText(input.twitterImage);
  const viewportContent = normalizeText(input.viewportContent);
  const contentType = normalizeText(input.contentType);
  const h1Count = Number.isFinite(input.h1Count) ? Math.max(0, Math.round(input.h1Count)) : 0;
  const wordCount = Number.isFinite(input.wordCount) ? Math.max(0, Math.round(input.wordCount)) : 0;
  const statusCode = Number.isFinite(input.statusCode) ? Math.round(input.statusCode) : null;
  const sourceAnchors = Array.isArray(input.sourceAnchors)
    ? input.sourceAnchors.map(normalizeAnchor)
    : [];
  const linkedImages = Array.isArray(input.linkedImages)
    ? input.linkedImages.map(normalizeLinkedImage)
    : [];
  const structuredDataKinds = normalizeStructuredDataKinds(input.structuredDataKinds);
  const redirectChain = normalizeRedirectChain(input.redirectChain);
  const robotsTxt = normalizeRobotsTxt(input.robotsTxt);
  const metaRobotsTags = uniqueValues(
    (Array.isArray(input.metaRobotsTags) ? input.metaRobotsTags : [input.robotsContent])
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const googlebotRobotsTags = uniqueValues(
    (Array.isArray(input.googlebotRobotsTags) ? input.googlebotRobotsTags : [])
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const xRobotsTagHeaders = uniqueValues(
    (Array.isArray(input.xRobotsTagHeaders) ? input.xRobotsTagHeaders : [input.xRobotsTag])
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const htmlCanonicalLinks = normalizeLinkAnnotations(
    Array.isArray(input.htmlCanonicalLinks)
      ? input.htmlCanonicalLinks
      : input.canonicalUrl
        ? [{ href: input.canonicalUrl, rel: "canonical" }]
        : []
  );
  const headerCanonicalLinks = normalizeLinkAnnotations(input.headerCanonicalLinks);
  const htmlAlternateLinks = normalizeLinkAnnotations(input.htmlAlternateLinks);
  const headerAlternateLinks = normalizeLinkAnnotations(input.headerAlternateLinks);
  const robotsControl = buildRobotsControl(metaRobotsTags, googlebotRobotsTags, xRobotsTagHeaders);
  const canonicalControl = buildCanonicalControl(
    htmlCanonicalLinks,
    headerCanonicalLinks,
    input.finalUrl ?? input.requestedUrl ?? "https://example.com",
    input.finalUrl ?? input.requestedUrl ?? null
  );
  const alternateLanguageControl = buildAlternateLanguageControl(
    htmlAlternateLinks,
    headerAlternateLinks,
    input.finalUrl ?? input.requestedUrl ?? "https://example.com"
  );
  const linkDiscoveryControl = buildLinkDiscoveryControl(sourceAnchors);
  const titleControl = buildTitleControl(title);
  const metaDescriptionControl = buildMetaDescriptionControl(metaDescription);
  const headingControl = buildHeadingControl(h1Count);
  const structuredDataControl = buildStructuredDataControl(input.structuredDataJsonLdBlocks);
  const socialMetadataControl = buildSocialMetadataControl({
    openGraphTitle,
    openGraphDescription,
    openGraphType,
    openGraphUrl,
    openGraphImage,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    duplicateHeadCounts: input.duplicateHeadCounts,
  });
  const robotsPreviewControl = buildRobotsPreviewControl(robotsControl);
  const viewportControl = buildViewportControl(viewportContent);
  const faviconControl = buildFaviconControl(input.iconLinks);
  const headHygieneControl = buildHeadHygieneControl(input.duplicateHeadCounts);
  const canonicalTargetControl = buildCanonicalTargetControl({
    canonicalControl,
    pageFinalUrl: input.finalUrl ?? input.requestedUrl ?? null,
    canonicalTargetInspection: input.canonicalTargetInspection,
  });
  const sameOriginCrawlableLinks = sourceAnchors.filter((anchor) => anchor.sameOrigin && anchor.crawlable);
  const nonCrawlableLinks = sourceAnchors.filter((anchor) => !anchor.crawlable);
  const emptyAnchorTextCount = sourceAnchors.filter((anchor) => !anchor.text).length;
  const genericAnchorTextCount = sourceAnchors.filter(
    (anchor) => anchor.crawlable && anchor.text && GENERIC_ANCHOR_TEXT.has(anchor.text.toLowerCase())
  ).length;

  return {
    ...input,
    title,
    metaDescription,
    canonicalUrl: canonicalControl.candidates.find((candidate) => candidate.surface === "html")?.href ?? null,
    lang,
    robotsContent: metaRobotsTags[0] ?? null,
    metaRobotsTags,
    googlebotRobotsTags,
    openGraphTitle,
    openGraphDescription,
    openGraphType,
    openGraphUrl,
    openGraphImage,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    viewportContent,
    contentType,
    xRobotsTag: xRobotsTagHeaders.join(", ") || null,
    xRobotsTagHeaders,
    h1Count,
    wordCount,
    statusCode,
    sourceAnchors,
    linkedImages,
    structuredDataKinds,
    redirectChain,
    robotsTxt,
    htmlCanonicalLinks,
    headerCanonicalLinks,
    htmlAlternateLinks,
    headerAlternateLinks,
    robotsControl,
    canonicalControl,
    canonicalTargetControl,
    alternateLanguageControl,
    linkDiscoveryControl,
    titleControl,
    metaDescriptionControl,
    headingControl,
    structuredDataControl,
    socialMetadataControl,
    robotsPreviewControl,
    viewportControl,
    faviconControl,
    headHygieneControl,
    hasTitle: Boolean(title),
    titleLength: title ? title.length : 0,
    hasPlaceholderTitle: title ? PLACEHOLDER_TITLES.has(title.toLowerCase()) : false,
    hasMetaDescription: Boolean(metaDescription),
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    hasCanonicalUrl: canonicalControl.candidates.length > 0,
    canonicalStatus:
      canonicalControl.candidates[0]?.status ?? (canonicalControl.status === "missing" ? "missing" : "invalid"),
    resolvedCanonicalUrl: canonicalControl.resolvedCanonicalUrl,
    hasPrimaryHeading: h1Count > 0,
    hasSingleH1: h1Count === 1,
    hasSocialPreview: socialMetadataControl.openGraph.presentFields.length > 0,
    blocksIndexing: robotsControl.hasBlockingNoindex,
    blocksIndexingViaHeader:
      robotsControl.entries.some(
        (entry) => entry.surface === "x_robots_tag" && entry.indexingValues.includes("noindex")
      ) && robotsControl.effectiveIndexing === "noindex",
    isHtmlResponse: isHtmlContentType(contentType),
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
    canonicalConsistency: canonicalControl.consistency,
    canonicalContradictsIndexing: canonicalControl.consistency === "contradicts",
  };
}
