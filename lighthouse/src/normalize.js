const LIGHTHOUSE_AUDIT_DEFS = [
  {
    id: "document-title",
    severity: "high",
    label: "Add a unique page title",
    instruction:
      "Add a unique <title> that names the page and its primary intent so search engines can classify it quickly.",
    selector: "head > title",
  },
  {
    id: "meta-description",
    severity: "medium",
    label: "Add a descriptive meta description",
    instruction:
      "Write a concise meta description that states the page value and invites the right click-through.",
    selector: "head > meta[name=\"description\"]",
  },
  {
    id: "structured-data",
    severity: "medium",
    label: "Strengthen structured data coverage",
    instruction:
      "Add or expand valid structured data so the page entity and offer details are easier to interpret.",
  },
  {
    id: "crawlable-anchors",
    severity: "medium",
    label: "Make key links crawlable",
    instruction:
      "Replace non-crawlable navigation actions with real anchor links so bots can follow important paths.",
  },
  {
    id: "largest-contentful-paint",
    severity: "high",
    label: "Improve largest contentful paint",
    instruction:
      "Optimize the LCP element by prioritizing the hero asset, reducing server delay, and trimming render-blocking work.",
    metric: "LCP",
  },
  {
    id: "render-blocking-resources",
    severity: "medium",
    label: "Reduce render-blocking resources",
    instruction:
      "Defer or inline blocking CSS and scripts so the first paint can start sooner.",
  },
  {
    id: "server-response-time",
    severity: "medium",
    label: "Lower server response time",
    instruction:
      "Reduce backend response time for the main document so the page can begin rendering faster.",
    metric: "TTFB",
  },
  {
    id: "uses-responsive-images",
    severity: "medium",
    label: "Serve responsive images",
    instruction:
      "Provide correctly sized responsive images so large assets are not shipped to smaller viewports.",
  },
];

function toPercent(score) {
  if (typeof score !== "number") {
    return null;
  }

  return Math.round(score * 100);
}

function hasIssue(audit) {
  if (!audit) {
    return false;
  }

  if (audit.scoreDisplayMode === "notApplicable") {
    return false;
  }

  if (typeof audit.score === "number") {
    return audit.score < 0.9;
  }

  return audit.scoreDisplayMode === "manual" || audit.scoreDisplayMode === "informative";
}

function pickScore(categories, key) {
  return toPercent(categories?.[key]?.score) ?? 0;
}

export function normalizeLighthouseResult(result, requestedUrl) {
  const lhr = result?.lhr ?? {};
  const categories = lhr.categories ?? {};
  const audits = lhr.audits ?? {};
  const findings = [];

  for (const definition of LIGHTHOUSE_AUDIT_DEFS) {
    const audit = audits[definition.id];
    if (!hasIssue(audit)) {
      continue;
    }

    findings.push({
      id: definition.id,
      label: definition.label,
      severity: definition.severity,
      instruction: definition.instruction,
      selector: definition.selector ?? null,
      metric: definition.metric ?? null,
      metadata: {
        title: audit.title ?? null,
        description: audit.description ?? null,
        displayValue: audit.displayValue ?? null,
        score: typeof audit.score === "number" ? toPercent(audit.score) : null,
      },
    });
  }

  findings.sort((left, right) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return severityRank[left.severity] - severityRank[right.severity];
  });

  return {
    requestedUrl,
    finalUrl: lhr.finalDisplayedUrl ?? requestedUrl,
    score: pickScore(categories, "seo"),
    categoryScores: {
      performance: pickScore(categories, "performance"),
      accessibility: pickScore(categories, "accessibility"),
      bestPractices: pickScore(categories, "best-practices"),
      seo: pickScore(categories, "seo"),
    },
    findings,
    rawSummary: {
      fetchTime: lhr.fetchTime ?? null,
      userAgent: lhr.userAgent ?? null,
      lighthouseVersion: lhr.lighthouseVersion ?? null,
    },
  };
}
