function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function averageScore(scores) {
  if (scores.length === 0) {
    return 0;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return clampScore(total / scores.length);
}

function issueCheck(id, label, category, severity, instruction, detail, selector, metric, metadata) {
  return {
    id,
    label,
    category,
    status: "issue",
    severity,
    instruction,
    detail,
    selector,
    metric,
    metadata,
  };
}

function passedCheck(id, label, category, detail, selector, metric, metadata) {
  return {
    id,
    label,
    category,
    status: "passed",
    severity: null,
    instruction: null,
    detail,
    selector,
    metric,
    metadata,
  };
}

function toSeverityRank(severity) {
  switch (severity) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

function toRulePriority(id) {
  switch (id) {
    case "document-title":
      return 0;
    case "meta-description":
      return 1;
    case "primary-heading":
      return 2;
    default:
      return 10;
  }
}

export function normalizeSeoAuditResult(input) {
  const title = normalizeText(input.title);
  const metaDescription = normalizeText(input.metaDescription);
  const canonicalUrl = normalizeText(input.canonicalUrl);
  const lang = normalizeText(input.lang);
  const robotsContent = normalizeText(input.robotsContent);
  const openGraphTitle = normalizeText(input.openGraphTitle);
  const openGraphDescription = normalizeText(input.openGraphDescription);
  const hasIndexingBlock = robotsContent ? /\bnoindex\b/i.test(robotsContent) : false;
  const hasSocialPreview = Boolean(openGraphTitle || openGraphDescription);
  const wordCount = Number.isFinite(input.wordCount) ? Math.max(0, Math.round(input.wordCount)) : 0;
  const h1Count = Number.isFinite(input.h1Count) ? Math.max(0, Math.round(input.h1Count)) : 0;

  const checks = [
    title
      ? passedCheck(
          "document-title",
          "Page title is present",
          "metadata",
          "The page already includes a title element that search engines can read.",
          "head > title",
          null,
          { length: title.length }
        )
      : issueCheck(
          "document-title",
          "Add a unique page title",
          "metadata",
          "high",
          "Add a unique <title> that clearly names the page and its primary search intent.",
          null,
          "head > title",
          null,
          { length: 0 }
        ),
    metaDescription
      ? passedCheck(
          "meta-description",
          "Meta description is present",
          "metadata",
          "Search engines can already read a summary snippet for this page.",
          'head > meta[name="description"]',
          null,
          { length: metaDescription.length }
        )
      : issueCheck(
          "meta-description",
          "Add a meta description",
          "metadata",
          "high",
          "Add a concise meta description that summarizes the page and encourages the right click-through.",
          null,
          'head > meta[name="description"]',
          null,
          { length: 0 }
        ),
    hasSocialPreview
      ? passedCheck(
          "social-preview",
          "Social preview metadata is present",
          "metadata",
          "The page exposes at least one Open Graph field for richer link previews.",
          'head > meta[property^="og:"]',
          null,
          {
            openGraphTitlePresent: Boolean(openGraphTitle),
            openGraphDescriptionPresent: Boolean(openGraphDescription),
          }
        )
      : issueCheck(
          "social-preview",
          "Add Open Graph preview metadata",
          "metadata",
          "medium",
          "Add Open Graph title or description tags so shared links render with clearer context.",
          null,
          'head > meta[property^="og:"]',
          null,
          {
            openGraphTitlePresent: false,
            openGraphDescriptionPresent: false,
          }
        ),
    h1Count === 1
      ? passedCheck(
          "primary-heading",
          "Primary heading is well formed",
          "contentQuality",
          "The page uses a single primary heading.",
          "body h1",
          null,
          { h1Count }
        )
      : issueCheck(
          "primary-heading",
          "Strengthen the primary heading",
          "contentQuality",
          "medium",
          "Use exactly one descriptive <h1> that matches the page's primary search intent.",
          h1Count === 0 ? "No <h1> was found on the page." : `Found ${h1Count} <h1> elements.`,
          "body h1",
          null,
          { h1Count }
        ),
    wordCount >= 100
      ? passedCheck(
          "content-depth",
          "Content depth is sufficient",
          "contentQuality",
          "The page includes enough body copy to explain its topic to users and search engines.",
          "body",
          "word-count",
          { wordCount }
        )
      : issueCheck(
          "content-depth",
          "Add more explanatory copy",
          "contentQuality",
          "medium",
          "Expand the page with more useful body copy so the topic and intent are clearer.",
          `Detected roughly ${wordCount} words of body content.`,
          "body",
          "word-count",
          { wordCount }
        ),
    canonicalUrl
      ? passedCheck(
          "canonical-url",
          "Canonical URL is present",
          "crawlability",
          "The page declares a canonical URL.",
          'head > link[rel="canonical"]',
          null,
          { canonicalUrl }
        )
      : issueCheck(
          "canonical-url",
          "Add a canonical URL",
          "crawlability",
          "medium",
          "Add a canonical link element so search engines understand the preferred version of this page.",
          null,
          'head > link[rel="canonical"]',
          null,
          { canonicalUrl: null }
        ),
    lang
      ? passedCheck(
          "html-lang",
          "HTML language is declared",
          "crawlability",
          "The page declares its document language.",
          "html",
          null,
          { lang }
        )
      : issueCheck(
          "html-lang",
          "Declare the page language",
          "crawlability",
          "low",
          "Add a lang attribute on the <html> element to clarify language targeting.",
          null,
          "html",
          null,
          { lang: null }
        ),
    hasIndexingBlock
      ? issueCheck(
          "robots-indexing",
          "Allow indexing for this page",
          "crawlability",
          "high",
          "Remove noindex directives if this page is meant to appear in search results.",
          `Robots directives currently include: ${robotsContent}.`,
          'head > meta[name="robots"]',
          null,
          { robotsContent }
        )
      : passedCheck(
          "robots-indexing",
          "Robots directives allow indexing",
          "crawlability",
          "The current robots directives do not block indexing.",
          'head > meta[name="robots"]',
          null,
          { robotsContent }
        ),
  ];

  const metadataChecks = checks.filter((check) => check.category === "metadata");
  const contentQualityChecks = checks.filter((check) => check.category === "contentQuality");
  const crawlabilityChecks = checks.filter((check) => check.category === "crawlability");

  const categoryScores = {
    metadata: averageScore(metadataChecks.map((check) => (check.status === "passed" ? 100 : 0))),
    contentQuality: averageScore(contentQualityChecks.map((check) => (check.status === "passed" ? 100 : 0))),
    crawlability: averageScore(crawlabilityChecks.map((check) => (check.status === "passed" ? 100 : 0))),
  };

  const sortedChecks = [...checks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "issue" ? -1 : 1;
    }

    return (
      toSeverityRank(left.severity) - toSeverityRank(right.severity) ||
      toRulePriority(left.id) - toRulePriority(right.id) ||
      left.label.localeCompare(right.label)
    );
  }).map(({ category, ...check }) => check);

  return {
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl ?? input.requestedUrl,
    score: averageScore(Object.values(categoryScores)),
    categoryScores,
    checks: sortedChecks,
    rawSummary: {
      worker: "seo-audit-worker",
      statusCode: input.statusCode ?? null,
      contentType: input.contentType ?? null,
      wordCount,
    },
  };
}
