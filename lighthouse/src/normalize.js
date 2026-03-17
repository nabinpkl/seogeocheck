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

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const collapsed = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return collapsed === "" ? null : collapsed;
}

function toSeverity(audit) {
  if (!hasIssue(audit)) {
    return null;
  }

  if (audit?.scoreDisplayMode === "error") {
    return "high";
  }

  if (typeof audit?.score !== "number") {
    return "medium";
  }

  if (audit.score < 0.5) {
    return "high";
  }

  if (audit.score < 0.9) {
    return "medium";
  }

  return "low";
}

function toInstruction(title, description) {
  const normalizedTitle = normalizeText(title) ?? "this check";
  const normalizedDescription = normalizeText(description);

  if (!normalizedDescription) {
    return `Improve ${normalizedTitle.toLowerCase()}.`;
  }

  return `Improve ${normalizedTitle.toLowerCase()}. ${normalizedDescription}`;
}

function toDetail(audit) {
  const description = normalizeText(audit?.description);
  const displayValue =
    typeof audit?.displayValue === "string" && audit.displayValue.trim() !== ""
      ? audit.displayValue.trim()
      : null;

  if (displayValue && description) {
    return `${displayValue}. ${description}`;
  }

  return displayValue ?? description;
}

export function normalizeLighthouseResult(result, requestedUrl) {
  const lhr = result?.lhr ?? {};
  const categories = lhr.categories ?? {};
  const audits = lhr.audits ?? {};
  const checks = Object.entries(audits)
    .filter(([, audit]) => audit && audit.scoreDisplayMode !== "notApplicable")
    .map(([id, audit]) => {
      const issue = hasIssue(audit);
      const title = normalizeText(audit.title) ?? id;
      const description = normalizeText(audit.description);

      return {
        id,
        label: title,
        status: issue ? "issue" : "passed",
        severity: issue ? toSeverity(audit) : null,
        instruction: issue ? toInstruction(title, description) : null,
        detail: issue ? null : toDetail(audit),
        selector: null,
        metric: null,
        metadata: {
          title,
          description,
          displayValue: audit.displayValue ?? null,
          score: typeof audit.score === "number" ? toPercent(audit.score) : null,
          scoreDisplayMode: audit.scoreDisplayMode ?? null,
          numericValue:
            typeof audit.numericValue === "number" ? audit.numericValue : null,
        },
      };
    });

  checks.sort((left, right) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    if (left.status !== right.status) {
      return left.status === "issue" ? -1 : 1;
    }

    return (
      (severityRank[left.severity] ?? 2) - (severityRank[right.severity] ?? 2) ||
      left.label.localeCompare(right.label)
    );
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
    checks,
    rawSummary: {
      fetchTime: lhr.fetchTime ?? null,
      userAgent: lhr.userAgent ?? null,
      lighthouseVersion: lhr.lighthouseVersion ?? null,
    },
  };
}
