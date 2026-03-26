import { buildCanonicalControl, comparableUrl, isHtmlContentType } from "../rules/controlBuilders.js";

const DEFAULT_USER_AGENT = "SEOGEO/0.1 (+https://seogeo.local)";
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const ROBOTS_USER_AGENTS = ["Googlebot", "*"];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHeader(headers, name) {
  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase()) ?? null;
}

function getHeaderValues(headers, name) {
  if (!headers) {
    return [];
  }

  const normalizedName = name.toLowerCase();

  if (typeof headers.entries === "function") {
    const matches = [];
    for (const [headerName, value] of headers.entries()) {
      if (headerName.toLowerCase() === normalizedName && typeof value === "string" && value.trim() !== "") {
        matches.push(value);
      }
    }

    if (matches.length > 0) {
      return matches;
    }
  }

  const fallback = getHeader(headers, name);
  return typeof fallback === "string" && fallback.trim() !== "" ? [fallback] : [];
}

function splitHeaderValues(value) {
  const parts = [];
  let current = "";
  let inQuotes = false;
  let angleDepth = 0;

  for (const character of value) {
    if (character === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && character === "<") {
      angleDepth += 1;
    } else if (!inQuotes && character === ">" && angleDepth > 0) {
      angleDepth -= 1;
    }

    if (!inQuotes && angleDepth === 0 && character === ",") {
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

function parseLinkHeaderValues(headerValues) {
  const annotations = [];

  for (const headerValue of headerValues) {
    for (const segment of splitHeaderValues(headerValue)) {
      const match = segment.match(/^<([^>]+)>(.*)$/);
      if (!match) {
        continue;
      }

      const [, href, parameterBlock] = match;
      const annotation = {
        href,
        rel: null,
        hreflang: null,
        media: null,
        type: null,
      };

      for (const rawParameter of parameterBlock.split(";")) {
        const parameter = rawParameter.trim();
        if (!parameter) {
          continue;
        }

        const [rawName, ...rawValueParts] = parameter.split("=");
        const name = rawName?.trim().toLowerCase();
        const rawValue = rawValueParts.join("=").trim();
        const value = rawValue.replace(/^"|"$/g, "") || null;

        if (name === "rel") {
          annotation.rel = value?.toLowerCase() ?? null;
        } else if (name === "hreflang") {
          annotation.hreflang = value?.toLowerCase() ?? null;
        } else if (name === "media") {
          annotation.media = value ?? null;
        } else if (name === "type") {
          annotation.type = value ?? null;
        }
      }

      annotations.push(annotation);
    }
  }

  return annotations;
}

function normalizeRobotsPath(pathname, search) {
  return `${pathname || "/"}${search || ""}`;
}

function compileRobotsPattern(pattern) {
  const hasEndAnchor = pattern.endsWith("$");
  const rawPattern = hasEndAnchor ? pattern.slice(0, -1) : pattern;
  const source = rawPattern
    .split("*")
    .map((part) => escapeRegex(part))
    .join(".*");

  return new RegExp(`^${source}${hasEndAnchor ? "$" : ""}`);
}

function parseRobotsGroups(body) {
  const groups = [];
  let currentGroup = null;

  const pushCurrentGroup = () => {
    if (currentGroup && currentGroup.userAgents.length > 0) {
      groups.push(currentGroup);
    }
    currentGroup = null;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      pushCurrentGroup();
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === "user-agent") {
      if (!currentGroup || currentGroup.rules.length > 0) {
        pushCurrentGroup();
        currentGroup = { userAgents: [], rules: [] };
      }
      currentGroup.userAgents.push(value.toLowerCase());
      continue;
    }

    if ((field === "allow" || field === "disallow") && currentGroup) {
      currentGroup.rules.push({
        directive: field,
        pattern: value,
      });
    }
  }

  pushCurrentGroup();
  return groups;
}

function selectRobotsRule(rules, targetPath) {
  let bestRule = null;

  for (const rule of rules) {
    if (!rule.pattern) {
      if (rule.directive === "allow" && !bestRule) {
        bestRule = { ...rule, matchLength: 0 };
      }
      continue;
    }

    if (!compileRobotsPattern(rule.pattern).test(targetPath)) {
      continue;
    }

    const candidate = {
      ...rule,
      matchLength: rule.pattern.replace(/\*/g, "").replace(/\$/g, "").length,
    };

    if (!bestRule) {
      bestRule = candidate;
      continue;
    }

    if (candidate.matchLength > bestRule.matchLength) {
      bestRule = candidate;
      continue;
    }

    if (
      candidate.matchLength === bestRule.matchLength &&
      candidate.directive === "allow" &&
      bestRule.directive === "disallow"
    ) {
      bestRule = candidate;
    }
  }

  return bestRule;
}

function getHtmlAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s\"'>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function extractNamedMetaValuesFromHtml(html, name) {
  const values = [];
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const metaName = getHtmlAttribute(tag, "name")?.trim().toLowerCase();
    if (metaName !== name.toLowerCase()) {
      continue;
    }

    const content = getHtmlAttribute(tag, "content")?.trim();
    if (content) {
      values.push(content);
    }
  }

  return values;
}

export function evaluateRobotsTxt(body, pageUrl) {
  const page = new URL(pageUrl);
  const targetPath = normalizeRobotsPath(page.pathname, page.search);
  const groups = parseRobotsGroups(body);

  for (const userAgent of ROBOTS_USER_AGENTS) {
    const matchingRules = groups
      .filter((group) => group.userAgents.includes(userAgent.toLowerCase()))
      .flatMap((group) => group.rules);

    if (matchingRules.length === 0) {
      continue;
    }

    const matchedRule = selectRobotsRule(matchingRules, targetPath);
    if (!matchedRule || !matchedRule.pattern) {
      return {
        status: "allowed",
        allowsCrawl: true,
        evaluatedUserAgent: userAgent,
        matchedDirective: null,
        matchedPattern: null,
      };
    }

    return {
      status: matchedRule.directive === "disallow" ? "blocked" : "allowed",
      allowsCrawl: matchedRule.directive !== "disallow",
      evaluatedUserAgent: userAgent,
      matchedDirective: matchedRule.directive,
      matchedPattern: matchedRule.pattern,
    };
  }

  return {
    status: "allowed",
    allowsCrawl: true,
    evaluatedUserAgent: null,
    matchedDirective: null,
    matchedPattern: null,
  };
}

async function followRedirectChain(targetUrl, fetchImpl, maxRedirects = 5) {
  const chain = [];
  let currentUrl = targetUrl;

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });

    const locationHeader = getHeader(response.headers, "location");
    const nextUrl = locationHeader ? new URL(locationHeader, currentUrl).toString() : null;

    chain.push({
      url: currentUrl,
      statusCode: response.status,
      location: nextUrl,
    });

    if (REDIRECT_STATUS_CODES.has(response.status) && nextUrl) {
      await response.body?.cancel?.();

      if (attempt === maxRedirects) {
        return {
          status: "too_many_redirects",
          finalUrl: nextUrl,
          finalResponseStatusCode: null,
          finalHeaders: null,
          finalBodyText: null,
          chain,
        };
      }

      currentUrl = nextUrl;
      continue;
    }

    let finalBodyText = null;
    try {
      finalBodyText = await response.text();
    } catch {
      await response.body?.cancel?.();
    }

    return {
      status: "ok",
      finalUrl: currentUrl,
      finalResponseStatusCode: response.status,
      finalHeaders: response.headers,
      finalBodyText,
      chain,
    };
  }

  return {
    status: "unavailable",
    finalUrl: null,
    finalResponseStatusCode: null,
    finalHeaders: null,
    finalBodyText: null,
    chain,
  };
}

async function fetchRobotsTxt(pageUrl, fetchImpl) {
  const robotsUrl = new URL("/robots.txt", pageUrl).toString();

  try {
    const response = await fetchImpl(robotsUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept: "text/plain,text/*;q=0.9,*/*;q=0.8",
      },
    });

    if (response.status === 404) {
      await response.body?.cancel?.();
      return {
        status: "missing",
        allowsCrawl: true,
        evaluatedUserAgent: null,
        matchedDirective: null,
        matchedPattern: null,
        fetchStatusCode: 404,
        url: robotsUrl,
        finalUrl: response.url || robotsUrl,
      };
    }

    if (!response.ok) {
      await response.body?.cancel?.();
      return {
        status: "unavailable",
        allowsCrawl: null,
        evaluatedUserAgent: null,
        matchedDirective: null,
        matchedPattern: null,
        fetchStatusCode: response.status,
        url: robotsUrl,
        finalUrl: response.url || robotsUrl,
      };
    }

    const body = await response.text();
    const evaluation = evaluateRobotsTxt(body, pageUrl);

    return {
      ...evaluation,
      fetchStatusCode: response.status,
      url: robotsUrl,
      finalUrl: response.url || robotsUrl,
    };
  } catch (error) {
    return {
      status: "unavailable",
      allowsCrawl: null,
      evaluatedUserAgent: null,
      matchedDirective: null,
      matchedPattern: null,
      fetchStatusCode: null,
      url: robotsUrl,
      finalUrl: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function inspectUrl(targetUrl, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to inspect SEO signals for a URL.");
  }

  let redirectInspection;
  try {
    redirectInspection = await followRedirectChain(targetUrl, fetchImpl);
  } catch (error) {
    redirectInspection = {
      status: "unavailable",
      finalUrl: targetUrl,
      finalResponseStatusCode: null,
      finalHeaders: null,
      finalBodyText: null,
      chain: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const effectiveFinalUrl = redirectInspection.finalUrl ?? targetUrl;
  const contentType = getHeader(redirectInspection.finalHeaders, "content-type");
  const html = isHtmlContentType(contentType) ? redirectInspection.finalBodyText ?? "" : "";
  const xRobotsTagHeaders = getHeaderValues(redirectInspection.finalHeaders, "x-robots-tag");
  const linkHeaderAnnotations = parseLinkHeaderValues(
    getHeaderValues(redirectInspection.finalHeaders, "link")
  );
  const robotsTxt = await fetchRobotsTxt(effectiveFinalUrl, fetchImpl);

  return {
    inspectedUrl: targetUrl,
    status: redirectInspection.status,
    finalUrl: effectiveFinalUrl,
    statusCode: redirectInspection.finalResponseStatusCode,
    contentType,
    metaRobotsTags: extractNamedMetaValuesFromHtml(html, "robots"),
    googlebotRobotsTags: extractNamedMetaValuesFromHtml(html, "googlebot"),
    xRobotsTag: xRobotsTagHeaders.join(", ") || null,
    xRobotsTagHeaders,
    headerCanonicalLinks: linkHeaderAnnotations.filter((annotation) => annotation.rel === "canonical"),
    headerAlternateLinks: linkHeaderAnnotations.filter(
      (annotation) => annotation.rel?.split(/\s+/).includes("alternate")
    ),
    redirectChain: {
      status: redirectInspection.status,
      totalRedirects: Math.max(0, redirectInspection.chain.length - 1),
      finalUrlChanged:
        Boolean(redirectInspection.finalUrl) && redirectInspection.finalUrl !== targetUrl,
      finalUrl: effectiveFinalUrl,
      chain: redirectInspection.chain,
      error: redirectInspection.error ?? null,
    },
    robotsTxt,
  };
}

export async function collectIndexabilityPreflight(
  { requestedUrl, finalUrl, htmlCanonicalLinks = [] },
  fetchImpl = globalThis.fetch
) {
  const pageInspection = await inspectUrl(requestedUrl, fetchImpl);
  const effectiveFinalUrl = finalUrl ?? pageInspection.finalUrl ?? requestedUrl;
  const canonicalControl = buildCanonicalControl(
    htmlCanonicalLinks,
    pageInspection.headerCanonicalLinks,
    effectiveFinalUrl,
    effectiveFinalUrl
  );

  let canonicalTargetInspection = null;
  if (canonicalControl.resolvedCanonicalUrl) {
    if (comparableUrl(canonicalControl.resolvedCanonicalUrl) === comparableUrl(effectiveFinalUrl)) {
      canonicalTargetInspection = {
        ...pageInspection,
        reusedCurrentPageInspection: true,
      };
    } else {
      canonicalTargetInspection = await inspectUrl(canonicalControl.resolvedCanonicalUrl, fetchImpl);
    }
  }

  return {
    xRobotsTag: pageInspection.xRobotsTag,
    xRobotsTagHeaders: pageInspection.xRobotsTagHeaders,
    headerCanonicalLinks: pageInspection.headerCanonicalLinks,
    headerAlternateLinks: pageInspection.headerAlternateLinks,
    redirectChain: pageInspection.redirectChain,
    robotsTxt: pageInspection.robotsTxt,
    canonicalTargetInspection,
  };
}
