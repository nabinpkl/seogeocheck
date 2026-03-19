import { ACTIVE_PACKS, SORTED_RULES } from "./rules/index.js";
import { deriveFacts } from "./rules/deriveFacts.js";

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

export function normalizeSeoAuditResult(input) {
  const facts = deriveFacts(input);
  const checks = SORTED_RULES.map((rule) => {
    const result = rule.check(facts);
    return {
      ...result,
      category: rule.packId,
      priority: rule.priority,
      relatedPacks: rule.relatedPacks,
    };
  });

  const categoryScores = Object.fromEntries(
    ACTIVE_PACKS.map((pack) => [
      pack.id,
      averageScore(
        checks
          .filter((check) => check.category === pack.id)
          .map((check) => (check.status === "passed" ? 100 : 0))
      ),
    ])
  );

  const sortedChecks = [...checks]
    .sort((left, right) => {
      // 1. Issues first
      if (left.status !== right.status) {
        return left.status === "issue" ? -1 : 1;
      }

      // 2. Severity (for issues)
      if (left.status === "issue") {
        const severityDiff = toSeverityRank(left.severity) - toSeverityRank(right.severity);
        if (severityDiff !== 0) return severityDiff;
      }

      // 3. Priority
      const priorityDiff = left.priority - right.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // 4. Label
      return left.label.localeCompare(right.label);
    })
    .map(({ category, priority, relatedPacks, ...check }) => check);

  return {
    requestedUrl: facts.requestedUrl,
    finalUrl: facts.finalUrl ?? facts.requestedUrl,
    score: averageScore(Object.values(categoryScores)),
    categoryScores,
    checks: sortedChecks,
    rawSummary: {
      worker: "seo-audit-worker",
      statusCode: facts.statusCode ?? null,
      contentType: facts.contentType ?? null,
      wordCount: facts.wordCount ?? 0,
    },
  };
}
