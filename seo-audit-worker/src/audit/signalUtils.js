import { normalizeText } from "../rules/utils.js";

export function countWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}

export function normalizeHref(value) {
  return normalizeText(value);
}

export function resolveHref(href, baseUrl) {
  if (!href || /^javascript:/i.test(href)) {
    return null;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function normalizeRelTokens(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((token) => normalizeText(token)?.toLowerCase()).filter(Boolean))];
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(/\s+/).map((token) => token.toLowerCase()).filter(Boolean))];
}

export function buildAnchorRecord(anchor, baseUrl, fragmentTargets = []) {
  const href = normalizeHref(anchor?.href);
  const text = normalizeText(anchor?.text);
  const relTokens = normalizeRelTokens(anchor?.rel ?? anchor?.relTokens);
  const usesJavascriptHref = href ? /^javascript:/i.test(href) : false;
  const isFragmentOnly = href ? href.startsWith("#") : false;
  const hasMatchingFragmentTarget = isFragmentOnly ? fragmentTargets.includes(href.slice(1)) : false;
  const resolvedHref = resolveHref(href, baseUrl);
  let sameOrigin = false;

  if (resolvedHref) {
    try {
      sameOrigin = new URL(resolvedHref).origin === new URL(baseUrl).origin;
    } catch {
      sameOrigin = false;
    }
  }

  let crawlable = false;
  if (resolvedHref && !usesJavascriptHref && !isFragmentOnly) {
    try {
      const protocol = new URL(resolvedHref).protocol;
      crawlable = protocol === "http:" || protocol === "https:";
    } catch {
      crawlable = false;
    }
  }

  return {
    href,
    resolvedHref,
    sameOrigin,
    crawlable,
    text,
    relTokens,
    usesJavascriptHref,
    isFragmentOnly,
    hasMatchingFragmentTarget,
  };
}

export function buildLinkedImageRecord(image, baseUrl) {
  const href = normalizeHref(image?.href);

  return {
    href,
    resolvedHref: resolveHref(href, baseUrl),
    alt: normalizeText(image?.alt),
  };
}
