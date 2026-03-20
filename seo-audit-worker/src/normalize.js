import { ACTIVE_PACKS, SORTED_RULES } from "./rules/index.js";
import { deriveFacts } from "./rules/deriveFacts.js";
import { compareSurfaces } from "./rules/compareSurfaces.js";

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

function deriveIndexabilityVerdict(facts) {
  const blockingSignals = [];
  const riskSignals = [];
  const unknownSignals = [];

  if (!facts.isReachable || !facts.isHtmlResponse) {
    unknownSignals.push("page_fetch_unconfirmed");
  }

  if (facts.blocksIndexing) {
    blockingSignals.push("meta_robots_blocks_indexing");
  }

  if (facts.blocksIndexingViaHeader) {
    blockingSignals.push("x_robots_tag_blocks_indexing");
  }

  if (facts.robotsTxtAllowsCrawl === false) {
    blockingSignals.push("robots_txt_blocks_crawling");
  }

  if (facts.robotsTxtAllowsCrawl === null) {
    unknownSignals.push("robots_txt_unconfirmed");
  }

  if (facts.redirectChainStatus === "unavailable") {
    unknownSignals.push("redirect_chain_unconfirmed");
  }

  if (blockingSignals.length > 0) {
    return {
      verdict: "Blocked",
      blockingSignals,
      riskSignals,
      unknownSignals,
    };
  }

  if (unknownSignals.length > 0) {
    return {
      verdict: "Unknown",
      blockingSignals,
      riskSignals,
      unknownSignals,
    };
  }

  if (facts.canonicalContradictsIndexing) {
    riskSignals.push("canonical_points_to_different_url");
  }

  if (facts.hasLongRedirectChain || facts.redirectChainStatus === "too_many_redirects") {
    riskSignals.push("redirect_chain_is_long");
  }

  if (facts.sourceWordCount < 20) {
    riskSignals.push("source_visible_text_is_thin");
  }

  return {
    verdict: riskSignals.length > 0 ? "At Risk" : "Indexable",
    blockingSignals,
    riskSignals,
    unknownSignals,
  };
}

export function normalizeSeoAuditResult(input) {
  const sourceFacts = deriveFacts(input);
  const renderedFacts = input.renderedDom
    ? deriveFacts({
        ...input.renderedDom,
        requestedUrl: sourceFacts.requestedUrl,
        finalUrl: input.renderedDom.finalUrl ?? sourceFacts.finalUrl ?? sourceFacts.requestedUrl,
      })
    : null;
  const sourceChecks = SORTED_RULES.map((rule) => {
    const result = rule.check(sourceFacts);
    return {
      ...result,
      metadata: {
        ...(result.metadata ?? {}),
        evidenceSource: "source_html",
      },
      category: rule.packId,
      priority: rule.priority,
      relatedPacks: rule.relatedPacks,
    };
  });
  const comparison = compareSurfaces({
    sourceFacts,
    renderedFacts,
    renderedError: input.renderedError,
  });
  const checks = [...sourceChecks, ...comparison.checks];
  const categoryIds = new Set([
    ...ACTIVE_PACKS.map((pack) => pack.id),
    ...checks.map((check) => check.category).filter(Boolean),
  ]);
  const indexabilityVerdict = deriveIndexabilityVerdict(sourceFacts);

  const categoryScores = Object.fromEntries(
    [...categoryIds].map((categoryId) => [
      categoryId,
      averageScore(
        checks
          .filter((check) => check.category === categoryId)
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
    requestedUrl: sourceFacts.requestedUrl,
    finalUrl: sourceFacts.finalUrl ?? sourceFacts.requestedUrl,
    indexabilityVerdict: indexabilityVerdict.verdict,
    score: averageScore(Object.values(categoryScores)),
    categoryScores,
    checks: sortedChecks,
    rawSummary: {
      worker: "seo-audit-worker",
      statusCode: sourceFacts.statusCode ?? null,
      contentType: sourceFacts.contentType ?? null,
      wordCount: sourceFacts.wordCount ?? 0,
      capturePasses: renderedFacts ? ["source_html", "rendered_dom"] : ["source_html"],
      sourceHtml: {
        wordCount: sourceFacts.sourceWordCount,
        sameOriginCrawlableLinkCount: sourceFacts.sameOriginCrawlableLinkCount,
        nonCrawlableLinkCount: sourceFacts.nonCrawlableLinkCount,
        emptyAnchorTextCount: sourceFacts.emptyAnchorTextCount,
        genericAnchorTextCount: sourceFacts.genericAnchorTextCount,
        linkedImageCount: sourceFacts.linkedImageCount,
        linkedImageMissingAltCount: sourceFacts.linkedImageMissingAltCount,
        structuredDataKinds: sourceFacts.structuredDataKinds,
      },
      xRobotsTag: {
        value: sourceFacts.xRobotsTag,
        blocksIndexing: sourceFacts.blocksIndexingViaHeader,
      },
      robotsTxt: sourceFacts.robotsTxt,
      redirectChain: sourceFacts.redirectChain,
      indexabilityVerdict,
      renderedDom: renderedFacts
        ? {
            wordCount: renderedFacts.sourceWordCount,
            sameOriginCrawlableLinkCount: renderedFacts.sameOriginCrawlableLinkCount,
            nonCrawlableLinkCount: renderedFacts.nonCrawlableLinkCount,
            emptyAnchorTextCount: renderedFacts.emptyAnchorTextCount,
            genericAnchorTextCount: renderedFacts.genericAnchorTextCount,
            linkedImageCount: renderedFacts.linkedImageCount,
            linkedImageMissingAltCount: renderedFacts.linkedImageMissingAltCount,
            structuredDataKinds: renderedFacts.structuredDataKinds,
          }
        : null,
      renderComparison: comparison.summary,
    },
  };
}
