import { normalizeText } from "./utils.js";

const HTML_CONTENT_TYPE_PATTERN = /^(text\/html|application\/xhtml\+xml)\b/i;
const PLACEHOLDER_TITLES = new Set(["home", "index", "untitled"]);
const GENERIC_ANCHOR_TEXT = new Set(["click here", "read more", "learn more"]);
const REL_BLOCKING_TOKENS = new Set(["nofollow", "ugc", "sponsored"]);
const ROBOTS_STATUS_FIELDS = [
  "indexing",
  "following",
  "snippet",
  "maxSnippet",
  "maxImagePreview",
  "maxVideoPreview",
];
const DIRECTIVE_PREFIXES = new Set([
  "index",
  "noindex",
  "follow",
  "nofollow",
  "none",
  "nosnippet",
  "noarchive",
  "notranslate",
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
]);

function splitCommaDelimited(value) {
  if (!value) {
    return [];
  }

  const parts = [];
  let current = "";
  let inQuotes = false;

  for (const character of value) {
    if (character === '"') {
      inQuotes = !inQuotes;
    }

    if (!inQuotes && character === ",") {
      if (current.trim() !== "") {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim() !== "") {
    parts.push(current.trim());
  }

  return parts;
}

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

function normalizeLinkAnnotations(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((annotation) => ({
    href: normalizeText(annotation?.href),
    rel: normalizeText(annotation?.rel)?.toLowerCase() ?? null,
    hreflang: normalizeText(annotation?.hreflang)?.toLowerCase() ?? null,
    media: normalizeText(annotation?.media),
    type: normalizeText(annotation?.type),
  }));
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

function resolveLinkStatus(href, baseUrl) {
  if (!href) {
    return {
      status: "missing",
      resolvedUrl: null,
    };
  }

  if (href.startsWith("#")) {
    return {
      status: "fragment-only",
      resolvedUrl: null,
    };
  }

  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return {
        status: "non-http",
        resolvedUrl: resolved.toString(),
      };
    }

    return {
      status: "valid",
      resolvedUrl: resolved.toString(),
    };
  } catch {
    return {
      status: "invalid",
      resolvedUrl: null,
    };
  }
}

function normalizeCanonicalCandidates(candidates, surface, baseUrl) {
  return candidates.map((candidate) => {
    const href = normalizeText(candidate?.href);
    const resolution = resolveLinkStatus(href, baseUrl);

    return {
      surface,
      href,
      rel: normalizeText(candidate?.rel)?.toLowerCase() ?? null,
      hreflang: normalizeText(candidate?.hreflang)?.toLowerCase() ?? null,
      media: normalizeText(candidate?.media),
      type: normalizeText(candidate?.type),
      status: resolution.status,
      resolvedUrl: resolution.resolvedUrl,
    };
  });
}

function buildCanonicalControl(htmlCanonicalLinks, headerCanonicalLinks, baseUrl, finalUrl) {
  const candidates = [
    ...normalizeCanonicalCandidates(htmlCanonicalLinks, "html", baseUrl),
    ...normalizeCanonicalCandidates(headerCanonicalLinks, "http_header", baseUrl),
  ];
  const validCandidates = candidates.filter((candidate) => candidate.status === "valid");
  const invalidCandidates = candidates.filter(
    (candidate) => candidate.status !== "valid" && candidate.status !== "missing"
  );
  const uniqueValidTargets = uniqueValues(validCandidates.map((candidate) => candidate.resolvedUrl));
  const htmlCount = candidates.filter((candidate) => candidate.surface === "html").length;
  const headerCount = candidates.filter((candidate) => candidate.surface === "http_header").length;
  let status = "clear";

  if (candidates.length === 0) {
    status = "missing";
  } else if (uniqueValidTargets.length > 1) {
    status = "conflict";
  } else if (validCandidates.length === 0) {
    status = "invalid";
  } else if (htmlCount > 1 || headerCount > 1) {
    status = "multiple";
  }

  const resolvedCanonicalUrl = uniqueValidTargets.length === 1 ? uniqueValidTargets[0] : null;
  const finalComparableUrl = comparableUrl(finalUrl);
  const canonicalComparableUrl = comparableUrl(resolvedCanonicalUrl);
  const consistency =
    canonicalComparableUrl && finalComparableUrl
      ? canonicalComparableUrl === finalComparableUrl
        ? "self"
        : "contradicts"
      : "unknown";

  return {
    status,
    candidates,
    uniqueTargetCount: uniqueValidTargets.length,
    uniqueTargets: uniqueValidTargets,
    htmlCount,
    headerCount,
    invalidCandidates,
    resolvedCanonicalUrl,
    consistency,
  };
}

function normalizeAlternateCandidates(candidates, surface, baseUrl) {
  return candidates.map((candidate) => {
    const href = normalizeText(candidate?.href);
    const hreflang = normalizeText(candidate?.hreflang)?.toLowerCase() ?? null;
    const resolution = resolveLinkStatus(href, baseUrl);

    return {
      surface,
      href,
      rel: normalizeText(candidate?.rel)?.toLowerCase() ?? null,
      hreflang,
      media: normalizeText(candidate?.media),
      type: normalizeText(candidate?.type),
      status: hreflang ? resolution.status : "ignored",
      resolvedUrl: hreflang ? resolution.resolvedUrl : null,
    };
  });
}

function buildAlternateLanguageControl(htmlAlternateLinks, headerAlternateLinks, baseUrl) {
  const annotations = [
    ...normalizeAlternateCandidates(htmlAlternateLinks, "html", baseUrl),
    ...normalizeAlternateCandidates(headerAlternateLinks, "http_header", baseUrl),
  ].filter((annotation) => annotation.hreflang);
  const validAnnotations = annotations.filter((annotation) => annotation.status === "valid");
  const invalidAnnotations = annotations.filter((annotation) => annotation.status !== "valid");
  const groupedByLanguage = Object.groupBy(validAnnotations, (annotation) => annotation.hreflang);
  const conflicts = Object.entries(groupedByLanguage)
    .map(([hreflang, group]) => ({
      hreflang,
      targets: uniqueValues(group.map((annotation) => annotation.resolvedUrl)),
    }))
    .filter((group) => group.targets.length > 1);

  let status = "present";
  if (annotations.length === 0) {
    status = "none";
  } else if (conflicts.length > 0) {
    status = "conflict";
  } else if (invalidAnnotations.length > 0 && validAnnotations.length === 0) {
    status = "invalid";
  } else if (invalidAnnotations.length > 0) {
    status = "incomplete";
  }

  return {
    status,
    annotations,
    validAnnotations,
    invalidAnnotations,
    conflicts,
    groupedByLanguage,
  };
}

function parseDirectiveText(rawValue) {
  const directives = [];
  const indexingValues = [];
  const followingValues = [];
  const snippetValues = [];
  const maxSnippetValues = [];
  const maxImagePreviewValues = [];
  const maxVideoPreviewValues = [];
  const unsupportedTokens = [];
  const malformedTokens = [];

  for (const rawToken of splitCommaDelimited(rawValue)) {
    const token = rawToken.trim().toLowerCase();
    if (!token) {
      malformedTokens.push(rawToken);
      continue;
    }

    directives.push(token);

    if (token === "none") {
      indexingValues.push("noindex");
      followingValues.push("nofollow");
      continue;
    }

    if (token === "index" || token === "noindex") {
      indexingValues.push(token);
      continue;
    }

    if (token === "follow" || token === "nofollow") {
      followingValues.push(token);
      continue;
    }

    if (token === "snippet" || token === "nosnippet") {
      snippetValues.push(token);
      continue;
    }

    if (token === "noarchive" || token === "notranslate") {
      continue;
    }

    let match = token.match(/^max-snippet:\s*(-?\d+)$/);
    if (match) {
      maxSnippetValues.push(match[1]);
      continue;
    }

    match = token.match(/^max-image-preview:\s*(none|standard|large)$/);
    if (match) {
      maxImagePreviewValues.push(match[1]);
      continue;
    }

    match = token.match(/^max-video-preview:\s*(-?\d+)$/);
    if (match) {
      maxVideoPreviewValues.push(match[1]);
      continue;
    }

    unsupportedTokens.push(token);
  }

  return {
    directives,
    indexingValues: uniqueValues(indexingValues),
    followingValues: uniqueValues(followingValues),
    snippetValues: uniqueValues(snippetValues),
    maxSnippetValues: uniqueValues(maxSnippetValues),
    maxImagePreviewValues: uniqueValues(maxImagePreviewValues),
    maxVideoPreviewValues: uniqueValues(maxVideoPreviewValues),
    unsupportedTokens,
    malformedTokens,
  };
}

function parseXRobotsTagHeaders(headers) {
  const entries = [];

  for (const rawHeader of headers) {
    let currentTarget = "all";

    for (const segment of splitCommaDelimited(rawHeader)) {
      const colonIndex = segment.indexOf(":");
      let directiveText = segment.trim();

      if (colonIndex !== -1) {
        const prefix = segment.slice(0, colonIndex).trim().toLowerCase();
        const remainder = segment.slice(colonIndex + 1).trim();
        if (prefix && !DIRECTIVE_PREFIXES.has(prefix)) {
          currentTarget = prefix;
          directiveText = remainder;
        }
      }

      if (!directiveText) {
        continue;
      }

      entries.push({
        surface: "x_robots_tag",
        target: currentTarget,
        rawValue: directiveText,
        ...parseDirectiveText(directiveText),
      });
    }
  }

  return entries;
}

function statusFromValues(values) {
  if (values.length === 0) {
    return null;
  }

  return values.length === 1 ? values[0] : "conflict";
}

function summarizeTarget(entries) {
  const indexingValues = uniqueValues(entries.flatMap((entry) => entry.indexingValues));
  const followingValues = uniqueValues(entries.flatMap((entry) => entry.followingValues));
  const snippetValues = uniqueValues(entries.flatMap((entry) => entry.snippetValues));
  const maxSnippetValues = uniqueValues(entries.flatMap((entry) => entry.maxSnippetValues));
  const maxImagePreviewValues = uniqueValues(entries.flatMap((entry) => entry.maxImagePreviewValues));
  const maxVideoPreviewValues = uniqueValues(entries.flatMap((entry) => entry.maxVideoPreviewValues));

  return {
    entries,
    indexingValues,
    followingValues,
    snippetValues,
    maxSnippetValues,
    maxImagePreviewValues,
    maxVideoPreviewValues,
    indexing: statusFromValues(indexingValues),
    following: statusFromValues(followingValues),
    snippet: statusFromValues(snippetValues),
    maxSnippet: statusFromValues(maxSnippetValues),
    maxImagePreview: statusFromValues(maxImagePreviewValues),
    maxVideoPreview: statusFromValues(maxVideoPreviewValues),
  };
}

function buildRobotsControl(metaRobotsTags, googlebotRobotsTags, xRobotsTagHeaders) {
  const entries = [
    ...metaRobotsTags.map((rawValue) => ({
      surface: "meta_robots",
      target: "all",
      rawValue,
      ...parseDirectiveText(rawValue),
    })),
    ...googlebotRobotsTags.map((rawValue) => ({
      surface: "meta_googlebot",
      target: "googlebot",
      rawValue,
      ...parseDirectiveText(rawValue),
    })),
    ...parseXRobotsTagHeaders(xRobotsTagHeaders),
  ];

  const entriesByTarget = Object.groupBy(entries, (entry) => entry.target);
  const targets = Object.fromEntries(
    Object.entries(entriesByTarget).map(([target, group]) => [target, summarizeTarget(group)])
  );
  const sameTargetConflicts = [];

  for (const [target, summary] of Object.entries(targets)) {
    for (const field of ROBOTS_STATUS_FIELDS) {
      if (summary[field] === "conflict") {
        sameTargetConflicts.push({
          target,
          field,
          values: summary[`${field}Values`],
        });
      }
    }
  }

  const targetedOverrides = [];
  const allTarget = targets.all;
  const googlebotTarget = targets.googlebot;
  if (allTarget && googlebotTarget) {
    for (const field of ROBOTS_STATUS_FIELDS) {
      const allValue = allTarget[field];
      const googlebotValue = googlebotTarget[field];
      if (
        allValue &&
        googlebotValue &&
        allValue !== "conflict" &&
        googlebotValue !== "conflict" &&
        allValue !== googlebotValue
      ) {
        targetedOverrides.push({
          target: "googlebot",
          field,
          generalValue: allValue,
          targetedValue: googlebotValue,
        });
      }
    }
  }

  const effectiveTarget = targets.googlebot ?? targets.all ?? null;

  return {
    status:
      entries.length === 0
        ? "missing"
        : sameTargetConflicts.length > 0
          ? "conflict"
          : targetedOverrides.length > 0
            ? "targeted"
            : "clear",
    entries,
    targets,
    sameTargetConflicts,
    targetedOverrides,
    unsupportedTokens: uniqueValues(entries.flatMap((entry) => entry.unsupportedTokens)),
    malformedTokens: uniqueValues(entries.flatMap((entry) => entry.malformedTokens)),
    effectiveIndexing: effectiveTarget?.indexing ?? null,
    effectiveFollowing: effectiveTarget?.following ?? null,
    effectiveSnippet: effectiveTarget?.snippet ?? null,
    effectiveTarget: targets.googlebot ? "googlebot" : targets.all ? "all" : null,
    hasBlockingNoindex: effectiveTarget?.indexing === "noindex",
  };
}

function buildLinkDiscoveryControl(sourceAnchors) {
  const internalCrawlableLinks = sourceAnchors.filter((anchor) => anchor.sameOrigin && anchor.crawlable);
  const internalNofollowLinks = internalCrawlableLinks.filter((anchor) =>
    anchor.relTokens.includes("nofollow")
  );
  const blockedByRelLinks = internalCrawlableLinks.filter((anchor) =>
    anchor.relTokens.some((token) => REL_BLOCKING_TOKENS.has(token))
  );
  const systemicBlocking =
    blockedByRelLinks.length > 0 &&
    blockedByRelLinks.length / Math.max(internalCrawlableLinks.length, 1) >= 0.5;

  return {
    status:
      blockedByRelLinks.length === 0 ? "clear" : systemicBlocking ? "systemic" : "partial",
    internalCrawlableLinkCount: internalCrawlableLinks.length,
    internalNofollowCount: internalNofollowLinks.length,
    blockedByRelCount: blockedByRelLinks.length,
    affectedLinks: blockedByRelLinks.slice(0, 5).map((anchor) => ({
      href: anchor.resolvedHref ?? anchor.href,
      text: anchor.text,
      relTokens: anchor.relTokens,
    })),
  };
}

export function deriveFacts(input) {
  const title = normalizeText(input.title);
  const metaDescription = normalizeText(input.metaDescription);
  const lang = normalizeText(input.lang);
  const openGraphTitle = normalizeText(input.openGraphTitle);
  const openGraphDescription = normalizeText(input.openGraphDescription);
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
    alternateLanguageControl,
    linkDiscoveryControl,
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
    hasSocialPreview: Boolean(openGraphTitle || openGraphDescription),
    blocksIndexing: robotsControl.hasBlockingNoindex,
    blocksIndexingViaHeader:
      robotsControl.entries.some(
        (entry) => entry.surface === "x_robots_tag" && entry.indexingValues.includes("noindex")
      ) && robotsControl.effectiveIndexing === "noindex",
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
    canonicalConsistency: canonicalControl.consistency,
    canonicalContradictsIndexing: canonicalControl.consistency === "contradicts",
  };
}
