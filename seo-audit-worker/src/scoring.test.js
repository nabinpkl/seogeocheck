import test from "node:test";
import assert from "node:assert/strict";
import { buildWeightedScoreBreakdown } from "./scoring.js";

function scoredCheck(overrides = {}) {
  return {
    id: "example-rule",
    category: "metadata",
    status: "passed",
    severity: null,
    scoreWeight: 4,
    ...overrides,
  };
}

test("buildWeightedScoreBreakdown applies weighted partial credit per rule severity", () => {
  const scoring = buildWeightedScoreBreakdown([
    scoredCheck({ id: "document-title", category: "metadata", scoreWeight: 4, status: "passed" }),
    scoredCheck({
      id: "meta-description",
      category: "metadata",
      scoreWeight: 4,
      status: "issue",
      severity: "low",
    }),
    scoredCheck({
      id: "core-metadata-alignment",
      category: "metadata",
      scoreWeight: 3,
      status: "issue",
      severity: "medium",
    }),
    scoredCheck({
      id: "structured-data-validity",
      category: "metadata",
      scoreWeight: 3,
      status: "issue",
      severity: "high",
    }),
  ]);

  assert.equal(scoring.categories.metadata.earnedWeight, 9.65);
  assert.equal(scoring.categories.metadata.availableWeight, 14);
  assert.equal(scoring.categories.metadata.score, 69);
  assert.equal(scoring.rules.find((rule) => rule.ruleId === "meta-description")?.earnedWeight, 3.4);
  assert.equal(
    scoring.rules.find((rule) => rule.ruleId === "core-metadata-alignment")?.earnedWeight,
    1.65
  );
  assert.equal(
    scoring.rules.find((rule) => rule.ruleId === "structured-data-validity")?.scoreImpact,
    2.4
  );
});

test("buildWeightedScoreBreakdown excludes unverifiable checks from score and lowers confidence", () => {
  const scoring = buildWeightedScoreBreakdown([
    scoredCheck({
      id: "url-reachable",
      category: "reachability",
      scoreWeight: 5,
      status: "passed",
    }),
    scoredCheck({
      id: "robots-txt-crawlability",
      category: "crawlability",
      scoreWeight: 5,
      status: "passed",
    }),
    scoredCheck({
      id: "robots-indexing",
      category: "indexability",
      scoreWeight: 5,
      status: "passed",
    }),
    scoredCheck({
      id: "source-visible-text",
      category: "contentVisibility",
      scoreWeight: 5,
      status: "passed",
    }),
    scoredCheck({
      id: "body-image-alt",
      category: "contentVisibility",
      scoreWeight: 2,
      status: "not_applicable",
    }),
    scoredCheck({
      id: "document-title",
      category: "metadata",
      scoreWeight: 4,
      status: "passed",
    }),
    scoredCheck({
      id: "rendered-visible-text",
      category: "discovery",
      scoreWeight: 5,
      status: "system_error",
    }),
  ]);

  assert.equal(scoring.categories.contentVisibility.score, 100);
  assert.equal(scoring.categories.contentVisibility.confidence, 71);
  assert.equal(scoring.categories.discovery.score, 0);
  assert.equal(scoring.categories.discovery.confidence, 0);
  assert.equal(scoring.overall.score, 100);
  assert.equal(scoring.overall.confidence, 91);
  assert.equal(
    scoring.rules.find((rule) => rule.ruleId === "body-image-alt")?.exclusionReason,
    "not_applicable"
  );
  assert.equal(
    scoring.rules.find((rule) => rule.ruleId === "rendered-visible-text")?.includedInScore,
    false
  );
});

test("buildWeightedScoreBreakdown requires severity on issue checks", () => {
  assert.throws(
    () =>
      buildWeightedScoreBreakdown([
        scoredCheck({
          id: "document-title",
          category: "metadata",
          scoreWeight: 4,
          status: "issue",
          severity: null,
        }),
      ]),
    /missing severity/i
  );
});
