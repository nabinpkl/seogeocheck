import { normalizeText } from "./utils.js";
import {
  buildAlternateLanguageControl,
  buildBodyImageAltControl,
  buildCanonicalControl,
  buildCanonicalSelfReferenceControl,
  buildCanonicalTargetControl,
  buildFaviconControl,
  buildHeadingControl,
  buildHeadingQualityControl,
  buildHeadHygieneControl,
  buildInternalLinkCoverageControl,
  buildLangControl,
  buildLinkDiscoveryControl,
  buildMetadataAlignmentControl,
  buildMetaDescriptionControl,
  buildMetaRefreshControl,
  buildRobotsPreviewControl,
  buildRobotsControl,
  buildSocialUrlControl,
  buildSoft404Control,
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

type AnyValue = ReturnType<typeof JSON.parse>;
type AnyObject = Record<string, AnyValue>;

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function normalizeAnchor(anchor: AnyObject | null | undefined) {
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

function normalizeLinkedImage(image: AnyObject | null | undefined) {
  return {
    href: normalizeText(image?.href),
    resolvedHref: normalizeText(image?.resolvedHref),
    alt: normalizeText(image?.alt),
  };
}

function normalizeHeading(heading: AnyObject | null | undefined) {
  const rawLevel = heading?.level;
  const level = Number.isFinite(rawLevel) ? Math.round(rawLevel) : null;

  return {
    level: level !== null && Number.isInteger(level) && level >= 1 && level <= 6 ? level : null,
    text: normalizeText(heading?.text),
  };
}

function normalizeBodyImage(image: AnyObject | null | undefined) {
  const rawWidth = image?.width;
  const rawHeight = image?.height;
  const width = Number.isFinite(rawWidth) ? Math.round(rawWidth) : null;
  const height = Number.isFinite(rawHeight) ? Math.round(rawHeight) : null;

  return {
    src: normalizeText(image?.src),
    resolvedSrc: normalizeText(image?.resolvedSrc),
    alt: normalizeText(image?.alt),
    role: normalizeText(image?.role)?.toLowerCase() ?? null,
    ariaHidden: normalizeText(image?.ariaHidden)?.toLowerCase() ?? null,
    width: Number.isInteger(width) ? width : null,
    height: Number.isInteger(height) ? height : null,
    hasUsableSrc: image?.hasUsableSrc === true,
    isExplicitlyDecorative: image?.isExplicitlyDecorative === true,
    isTrackingPixel: image?.isTrackingPixel === true,
  };
}

export function deriveFacts(input: AnyObject) {
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
  const headingOutline = Array.isArray(input.headingOutline)
    ? input.headingOutline.map(normalizeHeading).filter((heading) => heading.level !== null)
    : [];
  const bodyImages = Array.isArray(input.bodyImages)
    ? input.bodyImages.map(normalizeBodyImage)
    : [];
  const structuredDataKinds = normalizeStructuredDataKinds(input.structuredDataKinds);
  const redirectChain = normalizeRedirectChain(input.redirectChain);
  const robotsTxt = normalizeRobotsTxt(input.robotsTxt);
  const metaRefreshTags = uniqueValues(
    (Array.isArray(input.metaRefreshTags) ? input.metaRefreshTags : [])
      .map((value) => (typeof value === "string" ? value : null))
      .filter((value) => value !== null)
  );
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
  const headingControl = buildHeadingControl(h1Count, headingOutline);
  const headingQualityControl = buildHeadingQualityControl(headingOutline);
  const bodyImageAltControl = buildBodyImageAltControl(bodyImages);
  const langControl = buildLangControl(lang);
  const metaRefreshControl = buildMetaRefreshControl(
    metaRefreshTags,
    input.finalUrl ?? input.requestedUrl ?? "https://example.com"
  );
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
  const socialUrlControl = buildSocialUrlControl({
    openGraphUrl,
    openGraphImage,
    twitterImage,
    baseUrl: input.finalUrl ?? input.requestedUrl ?? "https://example.com",
  });
  const metadataAlignmentControl = buildMetadataAlignmentControl({
    title,
    metaDescription,
    headingOutline,
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
  const canonicalSelfReferenceControl = buildCanonicalSelfReferenceControl({
    canonicalControl,
    finalUrl: input.finalUrl ?? input.requestedUrl ?? null,
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
    isHtmlResponse: isHtmlContentType(contentType),
    robotsControl,
  });
  const soft404Control = buildSoft404Control({
    statusCode,
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
    isHtmlResponse: isHtmlContentType(contentType),
    title,
    metaDescription,
    headingOutline,
    wordCount,
    canonicalSelfReferenceControl,
  });
  const sameOriginCrawlableLinks = sourceAnchors.filter((anchor) => anchor.sameOrigin && anchor.crawlable);
  const nonCrawlableLinks = sourceAnchors.filter((anchor) => !anchor.crawlable);
  const emptyAnchorTextCount = sourceAnchors.filter((anchor) => !anchor.text).length;
  const genericAnchorTextCount = sourceAnchors.filter(
    (anchor) => anchor.crawlable && anchor.text && GENERIC_ANCHOR_TEXT.has(anchor.text.toLowerCase())
  ).length;
  const internalLinkCoverageControl = buildInternalLinkCoverageControl({
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
    isHtmlResponse: isHtmlContentType(contentType),
    sourceWordCount: wordCount,
    sameOriginCrawlableLinkCount: sameOriginCrawlableLinks.length,
  });

  return {
    ...input,
    title,
    metaDescription,
    canonicalUrl: canonicalControl.candidates.find((candidate) => candidate.surface === "html")?.href ?? null,
    lang,
    robotsContent: metaRobotsTags[0] ?? null,
    metaRobotsTags,
    googlebotRobotsTags,
    metaRefreshTags,
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
    headingOutline,
    bodyImages,
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
    canonicalSelfReferenceControl,
    alternateLanguageControl,
    linkDiscoveryControl,
    internalLinkCoverageControl,
    titleControl,
    metaDescriptionControl,
    headingControl,
    headingQualityControl,
    bodyImageAltControl,
    soft404Control,
    langControl,
    metaRefreshControl,
    structuredDataControl,
    socialMetadataControl,
    socialUrlControl,
    metadataAlignmentControl,
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
    metaRefreshTagCount: metaRefreshTags.length,
    headingOutlineCount: headingOutline.length,
    headingHierarchySkipCount: headingControl.skippedTransitions.length,
    emptyHeadingCount: headingQualityControl.emptyHeadingCount,
    repeatedHeadingCount: headingQualityControl.repeatedHeadingCount,
    bodyImageCount: bodyImages.length,
    eligibleBodyImageCount: bodyImageAltControl.eligibleImageCount,
    bodyImageMissingAltCount: bodyImageAltControl.missingAltCount,
    hasValidLang: langControl.status === "valid",
    hasStructuredDataInSource: structuredDataKinds.length > 0,
    robotsTxtStatus: robotsTxt.status,
    robotsTxtAllowsCrawl: robotsTxt.allowsCrawl,
    redirectChainStatus: redirectChain.status,
    redirectCount: redirectChain.totalRedirects,
    redirectFinalUrlChanged: redirectChain.finalUrlChanged,
    hasLongRedirectChain: redirectChain.totalRedirects > 2,
    canonicalConsistency: canonicalControl.consistency,
    canonicalContradictsIndexing: canonicalSelfReferenceControl.status === "contradicts",
  };
}
