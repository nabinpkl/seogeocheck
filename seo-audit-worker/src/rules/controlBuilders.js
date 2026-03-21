import { normalizeText } from "./utils.js";

const HTML_CONTENT_TYPE_PATTERN = /^(text\/html|application\/xhtml\+xml)\b/i;
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

export const TITLE_TOO_SHORT_LENGTH = 15;
export const TITLE_TOO_LONG_LENGTH = 60;
export const META_DESCRIPTION_TOO_SHORT_LENGTH = 50;
export const META_DESCRIPTION_TOO_LONG_LENGTH = 160;

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

export function comparableUrl(value) {
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

export function normalizeRedirectChain(value) {
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

export function normalizeRobotsTxt(value) {
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

export function normalizeLinkAnnotations(value) {
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

export function normalizeStructuredDataKinds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((kind) => normalizeText(kind)).filter(Boolean))];
}

function normalizeStructuredDataJsonLdBlocks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((block) => (typeof block === "string" ? block : typeof block?.raw === "string" ? block.raw : ""))
    .map((block) => block.replace(/\r\n/g, "\n"))
    .filter((block) => typeof block === "string");
}

export function isHtmlContentType(contentType) {
  return Boolean(contentType && HTML_CONTENT_TYPE_PATTERN.test(contentType));
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

export function buildCanonicalControl(htmlCanonicalLinks, headerCanonicalLinks, baseUrl, finalUrl) {
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

export function buildAlternateLanguageControl(htmlAlternateLinks, headerAlternateLinks, baseUrl) {
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

export function buildRobotsControl(metaRobotsTags, googlebotRobotsTags, xRobotsTagHeaders) {
  const entries = [
    ...(Array.isArray(metaRobotsTags) ? metaRobotsTags : []).map((rawValue) => ({
      surface: "meta_robots",
      target: "all",
      rawValue,
      ...parseDirectiveText(rawValue),
    })),
    ...(Array.isArray(googlebotRobotsTags) ? googlebotRobotsTags : []).map((rawValue) => ({
      surface: "meta_googlebot",
      target: "googlebot",
      rawValue,
      ...parseDirectiveText(rawValue),
    })),
    ...parseXRobotsTagHeaders(Array.isArray(xRobotsTagHeaders) ? xRobotsTagHeaders : []),
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

export function buildLinkDiscoveryControl(sourceAnchors) {
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

export function buildTitleControl(title) {
  const length = title ? title.length : 0;

  return {
    status:
      !title
        ? "missing"
        : length < TITLE_TOO_SHORT_LENGTH
          ? "too_short"
          : length > TITLE_TOO_LONG_LENGTH
            ? "too_long"
            : "good",
    length,
    minLength: TITLE_TOO_SHORT_LENGTH,
    maxLength: TITLE_TOO_LONG_LENGTH,
  };
}

export function buildMetaDescriptionControl(metaDescription) {
  const length = metaDescription ? metaDescription.length : 0;

  return {
    status:
      !metaDescription
        ? "missing"
        : length < META_DESCRIPTION_TOO_SHORT_LENGTH
          ? "too_short"
          : length > META_DESCRIPTION_TOO_LONG_LENGTH
            ? "too_long"
            : "good",
    length,
    minLength: META_DESCRIPTION_TOO_SHORT_LENGTH,
    maxLength: META_DESCRIPTION_TOO_LONG_LENGTH,
  };
}

export function buildHeadingControl(h1Count) {
  return {
    status: h1Count === 0 ? "missing" : h1Count === 1 ? "single" : "multiple",
    h1Count,
  };
}

export function buildStructuredDataControl(structuredDataJsonLdBlocks) {
  const blocks = normalizeStructuredDataJsonLdBlocks(structuredDataJsonLdBlocks);
  const blockSummaries = [];
  let validJsonLdBlocks = 0;
  let invalidJsonLdBlocks = 0;
  let emptyJsonLdBlocks = 0;
  let missingContextBlocks = 0;
  let missingTypeBlocks = 0;

  for (const raw of blocks) {
    if (raw.trim() === "") {
      emptyJsonLdBlocks += 1;
      blockSummaries.push({
        status: "empty",
        hasContext: false,
        hasType: false,
      });
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      invalidJsonLdBlocks += 1;
      blockSummaries.push({
        status: "invalid_json",
        hasContext: false,
        hasType: false,
      });
      continue;
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    const objects = items.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    const hasContext = objects.some((item) => Object.hasOwn(item, "@context"));
    const hasType = objects.some((item) => Object.hasOwn(item, "@type"));

    if (objects.length === 0) {
      emptyJsonLdBlocks += 1;
      blockSummaries.push({
        status: "empty",
        hasContext: false,
        hasType: false,
      });
      continue;
    }

    if (!hasContext) {
      missingContextBlocks += 1;
    }

    if (!hasType) {
      missingTypeBlocks += 1;
    }

    if (hasContext && hasType) {
      validJsonLdBlocks += 1;
      blockSummaries.push({
        status: "valid",
        hasContext,
        hasType,
      });
      continue;
    }

    blockSummaries.push({
      status: "incomplete",
      hasContext,
      hasType,
    });
  }

  let status = "none";
  if (blocks.length > 0) {
    status =
      invalidJsonLdBlocks > 0
        ? "invalid"
        : emptyJsonLdBlocks > 0
          ? "empty"
          : missingContextBlocks > 0 || missingTypeBlocks > 0
            ? "incomplete"
            : "valid";
  }

  return {
    status,
    totalJsonLdBlocks: blocks.length,
    validJsonLdBlocks,
    invalidJsonLdBlocks,
    emptyJsonLdBlocks,
    missingContextBlocks,
    missingTypeBlocks,
    blocks: blockSummaries,
  };
}

export function normalizeUrlInspection(value) {
  const contentType = normalizeText(value?.contentType);
  const statusCode = Number.isFinite(value?.statusCode) ? Math.round(value.statusCode) : null;
  const redirectChain = normalizeRedirectChain(value?.redirectChain);
  const robotsTxt = normalizeRobotsTxt(value?.robotsTxt);
  const metaRobotsTags = uniqueValues(
    (Array.isArray(value?.metaRobotsTags) ? value.metaRobotsTags : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
  );
  const googlebotRobotsTags = uniqueValues(
    (Array.isArray(value?.googlebotRobotsTags) ? value.googlebotRobotsTags : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
  );
  const xRobotsTagHeaders = uniqueValues(
    (Array.isArray(value?.xRobotsTagHeaders) ? value.xRobotsTagHeaders : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
  );

  return {
    inspectedUrl: normalizeText(value?.inspectedUrl),
    status: normalizeText(value?.status) ?? "unavailable",
    finalUrl: normalizeText(value?.finalUrl),
    statusCode,
    contentType,
    isReachable: statusCode !== null && statusCode >= 200 && statusCode < 400,
    isHtmlResponse: isHtmlContentType(contentType),
    metaRobotsTags,
    googlebotRobotsTags,
    xRobotsTag: xRobotsTagHeaders.join(", ") || null,
    xRobotsTagHeaders,
    headerCanonicalLinks: normalizeLinkAnnotations(value?.headerCanonicalLinks),
    headerAlternateLinks: normalizeLinkAnnotations(value?.headerAlternateLinks),
    redirectChain,
    redirectCount: redirectChain.totalRedirects,
    robotsTxt,
    reusedCurrentPageInspection: value?.reusedCurrentPageInspection === true,
  };
}

export function buildCanonicalTargetControl({
  canonicalControl,
  pageFinalUrl,
  canonicalTargetInspection,
}) {
  const targetUrl = canonicalControl?.resolvedCanonicalUrl ?? null;
  if (!targetUrl) {
    return {
      status: "not_applicable",
      targetUrl: null,
      finalUrl: null,
      redirectCount: 0,
      reusedCurrentPageInspection: false,
      inspection: null,
      robotsControl: null,
    };
  }

  if (comparableUrl(targetUrl) === comparableUrl(pageFinalUrl)) {
    const inspection = canonicalTargetInspection
      ? normalizeUrlInspection(canonicalTargetInspection)
      : null;

    return {
      status: "self",
      targetUrl,
      finalUrl: inspection?.finalUrl ?? pageFinalUrl ?? targetUrl,
      redirectCount: inspection?.redirectCount ?? 0,
      reusedCurrentPageInspection: inspection?.reusedCurrentPageInspection === true,
      inspection,
      robotsControl: inspection
        ? buildRobotsControl(
            inspection.metaRobotsTags,
            inspection.googlebotRobotsTags,
            inspection.xRobotsTagHeaders
          )
        : null,
    };
  }

  if (!canonicalTargetInspection) {
    return {
      status: "not_applicable",
      targetUrl,
      finalUrl: null,
      redirectCount: 0,
      reusedCurrentPageInspection: false,
      inspection: null,
      robotsControl: null,
    };
  }

  const inspection = normalizeUrlInspection(canonicalTargetInspection);
  const robotsControl = buildRobotsControl(
    inspection.metaRobotsTags,
    inspection.googlebotRobotsTags,
    inspection.xRobotsTagHeaders
  );

  let status = "healthy";
  if (inspection.status === "unavailable" || inspection.statusCode === null) {
    status = "unknown";
  } else if (!inspection.isReachable) {
    status = "unreachable";
  } else if (!inspection.isHtmlResponse) {
    status = "non_html";
  } else if (inspection.robotsTxt.allowsCrawl === false) {
    status = "blocked_by_robots_txt";
  } else if (inspection.robotsTxt.allowsCrawl === null) {
    status = "unknown";
  } else if (
    robotsControl.sameTargetConflicts.some((conflict) => conflict.field === "indexing")
  ) {
    status = "unknown";
  } else if (robotsControl.hasBlockingNoindex) {
    status = "blocked_by_robots_directives";
  } else if (comparableUrl(inspection.finalUrl) !== comparableUrl(targetUrl)) {
    status = "redirected";
  }

  return {
    status,
    targetUrl,
    finalUrl: inspection.finalUrl,
    redirectCount: inspection.redirectCount,
    reusedCurrentPageInspection: inspection.reusedCurrentPageInspection,
    inspection,
    robotsControl,
  };
}
