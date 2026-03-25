import { inspectUrl } from "./indexabilityPreflight.js";
import { buildAnchorRecord } from "./signalUtils.js";
import {
  buildCanonicalControl,
  buildRobotsControl,
  comparableUrl,
  isHtmlContentType,
} from "../rules/controlBuilders.js";
import { normalizeText } from "../rules/utils.js";

const DEFAULT_USER_AGENT = "SEOGEO/0.1 (+https://seogeo.local)";
const MAX_SITEMAP_FILES = 5;
const SAMPLE_LIMIT = 5;
const NON_HTML_ASSET_PATTERN =
  /\.(?:xml|json|jpg|jpeg|png|gif|webp|svg|pdf|zip)(?:$|[?#])/i;

function uniqueUrls(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const comparable = comparableUrl(value);
    if (!comparable || seen.has(comparable)) {
      continue;
    }

    seen.add(comparable);
    output.push(comparable);
  }

  return output;
}

function toOriginRootUrl(value) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function toggleWwwHostname(hostname) {
  return hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`;
}

function buildVariantUrls(siteRootUrl) {
  const siteRoot = new URL(siteRootUrl);
  const toggledHostname = toggleWwwHostname(siteRoot.hostname);
  const variants = [];

  for (const hostname of [siteRoot.hostname, toggledHostname]) {
    for (const protocol of ["http:", "https:"]) {
      const candidate = new URL(siteRootUrl);
      candidate.protocol = protocol;
      candidate.hostname = hostname;
      candidate.pathname = "/";
      candidate.search = "";
      candidate.hash = "";
      variants.push(candidate.toString());
    }
  }

  return uniqueUrls([siteRootUrl, ...variants]);
}

async function fetchText(url, accept, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept,
      },
    });
    const contentType = response.headers.get("content-type");
    let body = null;

    try {
      body = await response.text();
    } catch {
      body = null;
    }

    return {
      url,
      finalUrl: response.url || url,
      statusCode: response.status,
      ok: response.ok,
      contentType,
      body,
      error: null,
    };
  } catch (error) {
    return {
      url,
      finalUrl: null,
      statusCode: null,
      ok: false,
      contentType: null,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function isSameOrigin(candidateUrl, siteRootUrl) {
  try {
    return new URL(candidateUrl).origin === new URL(siteRootUrl).origin;
  } catch {
    return false;
  }
}

function isHtmlCandidateUrl(candidateUrl, siteRootUrl) {
  if (!isSameOrigin(candidateUrl, siteRootUrl)) {
    return false;
  }

  try {
    const parsed = new URL(candidateUrl);
    return !NON_HTML_ASSET_PATTERN.test(`${parsed.pathname}${parsed.search}`);
  } catch {
    return false;
  }
}

function stripTags(value) {
  return normalizeText(value?.replace(/<[^>]+>/g, " ") ?? null);
}

function getHtmlAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s\"'>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function parseRobotsSitemapUrls(robotsBody, robotsUrl) {
  if (!robotsBody) {
    return [];
  }

  const declaredUrls = [];
  for (const rawLine of robotsBody.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^sitemap:\s*(.+)$/i);
    if (!match) {
      continue;
    }

    try {
      declaredUrls.push(new URL(match[1].trim(), robotsUrl).toString());
    } catch {
      continue;
    }
  }

  return uniqueUrls(declaredUrls);
}

function parseSitemapXml(xml, sitemapUrl) {
  const normalizedXml = typeof xml === "string" ? xml.trim() : "";
  if (!normalizedXml) {
    return {
      status: "invalid_xml",
      kind: null,
      urls: [],
      childSitemaps: [],
    };
  }

  const rootTagMatch = normalizedXml.match(/<(?:[a-z0-9_-]+:)?(urlset|sitemapindex)\b/i);
  const rootTag = rootTagMatch?.[1]?.toLowerCase() ?? null;
  const locMatches = [...normalizedXml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)];
  const resolvedLocs = locMatches
    .map((match) => normalizeText(match[1]))
    .filter(Boolean)
    .flatMap((value) => {
      try {
        return [new URL(value, sitemapUrl).toString()];
      } catch {
        return [];
      }
    });

  if (rootTag === "urlset") {
    return {
      status: "ok",
      kind: "urlset",
      urls: uniqueUrls(resolvedLocs),
      childSitemaps: [],
    };
  }

  if (rootTag === "sitemapindex") {
    return {
      status: "ok",
      kind: "sitemapindex",
      urls: [],
      childSitemaps: uniqueUrls(resolvedLocs),
    };
  }

  return {
    status: "invalid_xml",
    kind: null,
    urls: [],
    childSitemaps: [],
  };
}

function extractHtmlBasics(html, baseUrl) {
  const titleMatch = typeof html === "string" ? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) : null;
  const metaTags = typeof html === "string" ? html.match(/<meta\b[^>]*>/gi) ?? [] : [];
  const linkTags = typeof html === "string" ? html.match(/<link\b[^>]*>/gi) ?? [] : [];
  let metaDescription = null;

  for (const tag of metaTags) {
    const name = normalizeText(getHtmlAttribute(tag, "name"))?.toLowerCase();
    if (name !== "description") {
      continue;
    }

    metaDescription = normalizeText(getHtmlAttribute(tag, "content"));
    if (metaDescription) {
      break;
    }
  }

  const htmlCanonicalLinks = linkTags
    .map((tag) => ({
      href: normalizeText(getHtmlAttribute(tag, "href")),
      rel: normalizeText(getHtmlAttribute(tag, "rel")),
      hreflang: normalizeText(getHtmlAttribute(tag, "hreflang")),
      media: normalizeText(getHtmlAttribute(tag, "media")),
      type: normalizeText(getHtmlAttribute(tag, "type")),
    }))
    .filter((link) => link.rel?.toLowerCase().split(/\s+/).includes("canonical"));

  return {
    title: stripTags(titleMatch?.[1] ?? null),
    metaDescription,
    htmlCanonicalLinks,
    canonicalControl: buildCanonicalControl(
      htmlCanonicalLinks,
      [],
      baseUrl,
      baseUrl
    ),
  };
}

function extractAnchorCandidates(html, baseUrl) {
  if (typeof html !== "string" || html.trim() === "") {
    return [];
  }

  const anchors = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attrs = match[1] ?? "";
    const href = getHtmlAttribute(attrs, "href");
    const rel = getHtmlAttribute(attrs, "rel");
    const text = stripTags(match[2] ?? "");
    anchors.push(buildAnchorRecord({ href, rel, text }, baseUrl));
  }

  return anchors;
}

function toVariantSummary(requestedUrl, inspection) {
  const isReachable =
    Number.isFinite(inspection.statusCode) &&
    inspection.statusCode >= 200 &&
    inspection.statusCode < 400;
  const isHtmlResponse = isHtmlContentType(inspection.contentType);
  const robotsControl = buildRobotsControl(
    inspection.metaRobotsTags,
    inspection.googlebotRobotsTags,
    inspection.xRobotsTagHeaders
  );
  const finalOrigin = inspection.finalUrl
    ? (() => {
        try {
          return new URL(inspection.finalUrl).origin;
        } catch {
          return null;
        }
      })()
    : null;

  return {
    requestedUrl,
    finalUrl: inspection.finalUrl ?? null,
    finalOrigin,
    status: inspection.status,
    statusCode: inspection.statusCode ?? null,
    redirectCount: inspection.redirectCount ?? inspection.redirectChain?.totalRedirects ?? 0,
    isReachable,
    isHtmlResponse,
    robotsTxtAllowsCrawl: inspection.robotsTxt?.allowsCrawl ?? null,
    effectiveIndexing: robotsControl.effectiveIndexing,
    error: inspection.redirectChain?.error ?? inspection.robotsTxt?.error ?? null,
  };
}

function buildRobotsTxtSummary(robotsTextResponse, robotsInspection, declaredSitemapUrls) {
  return {
    status: robotsInspection.status ?? "unavailable",
    allowsCrawl: robotsInspection.allowsCrawl ?? null,
    evaluatedUserAgent: robotsInspection.evaluatedUserAgent ?? null,
    matchedDirective: robotsInspection.matchedDirective ?? null,
    matchedPattern: robotsInspection.matchedPattern ?? null,
    fetchStatusCode:
      robotsInspection.fetchStatusCode ?? robotsTextResponse.statusCode ?? null,
    url: robotsInspection.url ?? robotsTextResponse.url,
    finalUrl: robotsInspection.finalUrl ?? robotsTextResponse.finalUrl ?? null,
    error: robotsTextResponse.error ?? robotsInspection.error ?? null,
    declaredSitemapUrls,
  };
}

function buildSitemapSummary({
  siteRootUrl,
  discoveryMethod,
  declaredSitemapUrls,
  fallbackSitemapUrl,
  fetchedSitemaps,
  discoveredUrls,
}) {
  const sameOriginUrls = discoveredUrls.filter((url) => isHtmlCandidateUrl(url, siteRootUrl));
  let status = "ok";

  if (fetchedSitemaps.some((sitemap) => sitemap.status === "unavailable")) {
    status = "unavailable";
  } else if (
    fetchedSitemaps.some((sitemap) => sitemap.status === "invalid_xml") ||
    (declaredSitemapUrls.length > 0 &&
      fetchedSitemaps.some((sitemap) => sitemap.status !== "ok"))
  ) {
    status = "invalid";
  } else if (discoveryMethod === "none") {
    status = "missing";
  } else if (sameOriginUrls.length === 0) {
    status = "empty";
  }

  return {
    status,
    discoveryMethod,
    declaredSitemapUrls,
    fallbackSitemapUrl,
    processedSitemapCount: fetchedSitemaps.length,
    discoveredUrlCount: discoveredUrls.length,
    sameOriginUrlCount: sameOriginUrls.length,
    fetchedSitemaps,
    discoveredUrls: uniqueUrls(sameOriginUrls),
  };
}

async function discoverSitemaps(siteRootUrl, robotsTxtSummary, fetchImpl) {
  const declaredSitemapUrls = uniqueUrls(robotsTxtSummary.declaredSitemapUrls);
  const fallbackSitemapUrl = new URL("/sitemap.xml", siteRootUrl).toString();
  const queue = declaredSitemapUrls.length > 0 ? [...declaredSitemapUrls] : [fallbackSitemapUrl];
  const fetchedSitemaps = [];
  const discoveredUrls = [];
  const seenSitemapUrls = new Set();

  while (queue.length > 0 && fetchedSitemaps.length < MAX_SITEMAP_FILES) {
    const sitemapUrl = queue.shift();
    const comparable = comparableUrl(sitemapUrl);
    if (!comparable || seenSitemapUrls.has(comparable)) {
      continue;
    }

    seenSitemapUrls.add(comparable);
    const response = await fetchText(
      sitemapUrl,
      "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
      fetchImpl
    );

    if (!response.ok) {
      fetchedSitemaps.push({
        url: sitemapUrl,
        finalUrl: response.finalUrl,
        statusCode: response.statusCode,
        contentType: response.contentType,
        status: response.statusCode === 404 ? "missing" : response.error ? "unavailable" : "unavailable",
        kind: null,
        discoveredUrlCount: 0,
        sameOriginUrlCount: 0,
        error: response.error,
      });
      continue;
    }

    const parsed = parseSitemapXml(response.body, response.finalUrl ?? sitemapUrl);
    const sameOriginUrls = parsed.urls.filter((url) => isHtmlCandidateUrl(url, siteRootUrl));
    fetchedSitemaps.push({
      url: sitemapUrl,
      finalUrl: response.finalUrl,
      statusCode: response.statusCode,
      contentType: response.contentType,
      status: parsed.status,
      kind: parsed.kind,
      discoveredUrlCount: parsed.urls.length,
      sameOriginUrlCount: sameOriginUrls.length,
      error: response.error,
    });

    discoveredUrls.push(...sameOriginUrls);

    if (parsed.kind === "sitemapindex") {
      for (const childUrl of parsed.childSitemaps) {
        if (isSameOrigin(childUrl, siteRootUrl)) {
          queue.push(childUrl);
        }
      }
    }
  }

  const discoveryMethod =
    declaredSitemapUrls.length > 0
      ? "robots_txt"
      : fetchedSitemaps.some((sitemap) => sitemap.status !== "missing")
        ? "fallback"
        : "none";

  return buildSitemapSummary({
    siteRootUrl,
    discoveryMethod,
    declaredSitemapUrls,
    fallbackSitemapUrl,
    fetchedSitemaps,
    discoveredUrls: uniqueUrls(discoveredUrls),
  });
}

function buildSampleUrlList({ siteRootUrl, currentPageFinalUrl, sitemapUrls, homepageLinks }) {
  const ordered = [
    { url: siteRootUrl, source: "site_root" },
    { url: currentPageFinalUrl, source: "current_page" },
    ...sitemapUrls.map((url) => ({ url, source: "sitemap" })),
    ...homepageLinks.map((url) => ({ url, source: "homepage_link" })),
  ];
  const seen = new Set();
  const sampleUrls = [];

  for (const candidate of ordered) {
    const comparable = comparableUrl(candidate.url);
    if (!comparable || seen.has(comparable) || !isHtmlCandidateUrl(comparable, siteRootUrl)) {
      continue;
    }

    seen.add(comparable);
    sampleUrls.push({
      url: comparable,
      source: candidate.source,
    });

    if (sampleUrls.length >= SAMPLE_LIMIT) {
      break;
    }
  }

  return sampleUrls;
}

async function fetchHomepageLinks(siteRootUrl, fetchImpl) {
  const response = await fetchText(
    siteRootUrl,
    "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    fetchImpl
  );

  if (!response.ok || !response.body) {
    return [];
  }

  return extractAnchorCandidates(response.body, response.finalUrl ?? siteRootUrl)
    .filter((anchor) => anchor.sameOrigin && anchor.crawlable)
    .map((anchor) => anchor.resolvedHref ?? anchor.href)
    .filter(Boolean);
}

async function inspectSampleUrl(sample, fetchImpl) {
  const inspection = await inspectUrl(sample.url, fetchImpl);
  const isReachable =
    Number.isFinite(inspection.statusCode) &&
    inspection.statusCode >= 200 &&
    inspection.statusCode < 400;
  const isHtmlResponse = isHtmlContentType(inspection.contentType);
  const robotsControl = buildRobotsControl(
    inspection.metaRobotsTags,
    inspection.googlebotRobotsTags,
    inspection.xRobotsTagHeaders
  );
  const inspectionUnavailable =
    inspection.status === "unavailable" || inspection.statusCode === null;

  let hasTitle = false;
  let hasMetaDescription = false;
  let hasValidCanonical = false;

  if (!inspectionUnavailable && isReachable && isHtmlResponse) {
    const htmlResponse = await fetchText(
      inspection.finalUrl ?? sample.url,
      "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      fetchImpl
    );
    const basics = extractHtmlBasics(htmlResponse.body, htmlResponse.finalUrl ?? inspection.finalUrl ?? sample.url);
    hasTitle = Boolean(basics.title);
    hasMetaDescription = Boolean(basics.metaDescription);
    const canonicalControl = buildCanonicalControl(
      basics.htmlCanonicalLinks,
      inspection.headerCanonicalLinks,
      htmlResponse.finalUrl ?? inspection.finalUrl ?? sample.url,
      inspection.finalUrl ?? sample.url
    );
    hasValidCanonical =
      canonicalControl.status === "clear" && Boolean(canonicalControl.resolvedCanonicalUrl);
  }

  const indexable =
    isReachable &&
    isHtmlResponse &&
    inspection.robotsTxt.allowsCrawl === true &&
    !robotsControl.sameTargetConflicts.some((conflict) => conflict.field === "indexing") &&
    robotsControl.hasBlockingNoindex !== true;

  return {
    url: sample.url,
    source: sample.source,
    finalUrl: inspection.finalUrl ?? null,
    status: inspection.status,
    statusCode: inspection.statusCode ?? null,
    redirectCount: inspection.redirectChain?.totalRedirects ?? 0,
    isReachable,
    isHtmlResponse,
    robotsTxtAllowsCrawl: inspection.robotsTxt.allowsCrawl ?? null,
    effectiveIndexing: robotsControl.effectiveIndexing,
    indexable,
    hasTitle,
    hasMetaDescription,
    hasValidCanonical,
  };
}

function buildSampleCoverage(sampledUrls) {
  const sampledUrlCount = sampledUrls.length;
  const indexableUrlCount = sampledUrls.filter((sample) => sample.indexable).length;
  const titleCoverageCount = sampledUrls.filter((sample) => sample.hasTitle).length;
  const metaDescriptionCoverageCount = sampledUrls.filter((sample) => sample.hasMetaDescription).length;
  const canonicalCoverageCount = sampledUrls.filter((sample) => sample.hasValidCanonical).length;

  return {
    sampledUrlCount,
    indexableUrlCount,
    titleCoverageCount,
    metaDescriptionCoverageCount,
    canonicalCoverageCount,
    minimumPassingRatio: 0.8,
    indexableCoverageRatio: sampledUrlCount === 0 ? 0 : indexableUrlCount / sampledUrlCount,
    titleCoverageRatio: sampledUrlCount === 0 ? 0 : titleCoverageCount / sampledUrlCount,
    metaDescriptionCoverageRatio:
      sampledUrlCount === 0 ? 0 : metaDescriptionCoverageCount / sampledUrlCount,
    canonicalCoverageRatio: sampledUrlCount === 0 ? 0 : canonicalCoverageCount / sampledUrlCount,
  };
}

export async function discoverSitewideContext(
  { finalUrl, currentPageSourceAnchors = [] },
  fetchImpl = globalThis.fetch
) {
  const siteRootUrl = toOriginRootUrl(finalUrl);
  const variantUrls = buildVariantUrls(siteRootUrl);
  const variantInspections = await Promise.all(
    variantUrls.map((variantUrl) => inspectUrl(variantUrl, fetchImpl))
  );
  const hostVariants = variantInspections.map((inspection, index) =>
    toVariantSummary(variantUrls[index], inspection)
  );
  const uniqueFinalOrigins = uniqueUrls(
    hostVariants
      .filter((variant) => variant.finalOrigin && variant.isReachable)
      .map((variant) => variant.finalOrigin)
  );
  const preferredOrigin = uniqueFinalOrigins.length === 1 ? uniqueFinalOrigins[0] : null;

  const robotsTextResponse = await fetchText(
    new URL("/robots.txt", siteRootUrl).toString(),
    "text/plain,text/*;q=0.9,*/*;q=0.8",
    fetchImpl
  );
  const declaredSitemapUrls = parseRobotsSitemapUrls(
    robotsTextResponse.body,
    robotsTextResponse.finalUrl ?? robotsTextResponse.url
  );
  const rootVariantIndex = variantUrls.findIndex(
    (variantUrl) => comparableUrl(variantUrl) === comparableUrl(siteRootUrl)
  );
  const rootRobotsInspection = variantInspections[rootVariantIndex]?.robotsTxt;
  const robotsTxt = buildRobotsTxtSummary(
    robotsTextResponse,
    rootRobotsInspection ?? {
      status: robotsTextResponse.statusCode === 404 ? "missing" : robotsTextResponse.ok ? "allowed" : "unavailable",
      allowsCrawl: null,
      evaluatedUserAgent: null,
      matchedDirective: null,
      matchedPattern: null,
      fetchStatusCode: robotsTextResponse.statusCode,
      url: robotsTextResponse.url,
      finalUrl: robotsTextResponse.finalUrl,
      error: robotsTextResponse.error,
    },
    declaredSitemapUrls
  );
  const sitemap = await discoverSitemaps(siteRootUrl, robotsTxt, fetchImpl);

  const currentPageLinks = currentPageSourceAnchors
    .filter((anchor) => anchor?.sameOrigin && anchor?.crawlable)
    .map((anchor) => anchor.resolvedHref ?? anchor.href)
    .filter(Boolean);
  const homepageLinks =
    comparableUrl(siteRootUrl) === comparableUrl(finalUrl)
      ? currentPageLinks
      : await fetchHomepageLinks(siteRootUrl, fetchImpl);

  return {
    siteRootUrl,
    preferredOrigin,
    hostVariants,
    robotsTxt,
    sitemap,
    homepageLinks: uniqueUrls(homepageLinks),
  };
}

export async function collectSitewideSignals(
  { currentPageFinalUrl, discovery },
  fetchImpl = globalThis.fetch
) {
  const sampledUrlSeeds = buildSampleUrlList({
    siteRootUrl: discovery.siteRootUrl,
    currentPageFinalUrl,
    sitemapUrls: discovery.sitemap.discoveredUrls,
    homepageLinks: discovery.homepageLinks,
  });
  const sampledUrls = await Promise.all(
    sampledUrlSeeds.map((sample) => inspectSampleUrl(sample, fetchImpl))
  );

  return {
    siteRootUrl: discovery.siteRootUrl,
    preferredOrigin: discovery.preferredOrigin,
    hostVariants: discovery.hostVariants,
    robotsTxt: discovery.robotsTxt,
    sitemap: discovery.sitemap,
    sampledUrls,
    sampleCoverage: buildSampleCoverage(sampledUrls),
  };
}
