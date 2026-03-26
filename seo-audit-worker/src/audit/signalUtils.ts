import { normalizeText } from "../rules/utils.js";

const PIXEL_OR_SPACER_PATTERN =
  /(?:^|[\/._-])(pixel|spacer|blank|transparent|tracking|tracker|beacon)(?:[\/._-]|$)/i;

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

function normalizeDimension(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const normalized = normalizeText(value);
  if (!normalized || !/^\d+$/.test(normalized)) {
    return null;
  }

  return Math.max(0, Number.parseInt(normalized, 10));
}

export function buildHeadingRecord(heading) {
  const fallbackLevel =
    typeof heading?.tagName === "string" && /^h([1-6])$/i.test(heading.tagName)
      ? Number.parseInt(heading.tagName.slice(1), 10)
      : null;
  const level = Number.isFinite(heading?.level) ? Math.round(heading.level) : fallbackLevel;

  if (!Number.isInteger(level) || level < 1 || level > 6) {
    return null;
  }

  return {
    level,
    text: normalizeText(heading?.text),
  };
}

export function buildBodyImageRecord(image, baseUrl) {
  const src = normalizeHref(image?.src);
  const resolvedSrc = src ? resolveHref(src, baseUrl) : null;
  const role = normalizeText(image?.role)?.toLowerCase() ?? null;
  const ariaHidden = normalizeText(image?.ariaHidden)?.toLowerCase() ?? null;
  const width = normalizeDimension(image?.width);
  const height = normalizeDimension(image?.height);
  const isExplicitlyDecorative =
    role === "presentation" || role === "none" || ariaHidden === "true";
  const isTrackingPixel =
    (width === 1 && height === 1) || (src ? PIXEL_OR_SPACER_PATTERN.test(src) : false);

  return {
    src,
    resolvedSrc,
    alt: normalizeText(image?.alt),
    role,
    ariaHidden,
    width,
    height,
    hasUsableSrc: Boolean(src && resolvedSrc),
    isExplicitlyDecorative,
    isTrackingPixel,
  };
}
