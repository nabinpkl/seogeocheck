import test from "node:test";
import assert from "node:assert/strict";
import { crawlabilityRules } from "./crawlability.js";

function getRule(id) {
  return crawlabilityRules.find((rule) => rule.id === id);
}

function createFacts(overrides = {}) {
  return {
    robotsControl: {
      sameTargetConflicts: [],
      targetedOverrides: [],
      effectiveFollowing: "follow",
      effectiveTarget: "all",
      effectiveIndexing: "index",
      hasBlockingNoindex: false,
      hasNoarchiveDirective: false,
      hasNotranslateDirective: false,
    },
    soft404Control: {
      status: "clear",
      wordCount: 240,
      title: "Example Page",
      firstH1Text: "Example Page",
      matchedPhrases: [],
      titleLooksLikeError: false,
      headingLooksLikeError: false,
      metaDescriptionLooksLikeError: false,
      thinContent: false,
      missingPrimarySignals: false,
      canonicalContradicts: false,
      signalCount: 0,
    },
    ...overrides,
  };
}

test("robots-following flags effective nofollow as a high-severity issue", () => {
  const rule = getRule("robots-following");
  const result = rule.check(
    createFacts({
      robotsControl: {
        ...createFacts().robotsControl,
        effectiveFollowing: "nofollow",
      },
    })
  );

  assert.equal(result.status, "issue");
  assert.equal(result.severity, "high");
});

test("soft-404-likelihood escalates likely soft 404 patterns to high severity", () => {
  const rule = getRule("soft-404-likelihood");
  const result = rule.check(
    createFacts({
      soft404Control: {
        ...createFacts().soft404Control,
        status: "likely",
        wordCount: 28,
        matchedPhrases: ["page not found"],
        titleLooksLikeError: true,
        headingLooksLikeError: true,
        thinContent: true,
        signalCount: 4,
      },
    })
  );

  assert.equal(result.status, "issue");
  assert.equal(result.severity, "high");
});
