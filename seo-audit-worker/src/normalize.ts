import { SORTED_RULES } from "./rules/index.js";
import { deriveFacts } from "./rules/deriveFacts.js";
import { compareSurfaces } from "./rules/compareSurfaces.js";
import { buildWeightedScoreBreakdown } from "./scoring.js";

function statusRank(status) {
  switch (status) {
    case "issue":
      return 0;
    case "passed":
      return 1;
    case "not_applicable":
      return 2;
    case "system_error":
      return 3;
    default:
      return 4;
  }
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

  if (facts.robotsTxtAllowsCrawl === false) {
    blockingSignals.push("robots_txt_blocks_crawling");
  }

  if (facts.robotsTxtAllowsCrawl === null) {
    unknownSignals.push("robots_txt_unconfirmed");
  }

  if (facts.redirectChainStatus === "unavailable") {
    unknownSignals.push("redirect_chain_unconfirmed");
  }

  if (
    facts.robotsControl.sameTargetConflicts.some((conflict) => conflict.field === "indexing")
  ) {
    unknownSignals.push("robots_directives_conflict");
  } else if (facts.robotsControl.hasBlockingNoindex) {
    blockingSignals.push("robots_directives_block_indexing");
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

  if (
    facts.canonicalSelfReferenceControl?.expectsSelfReference === true &&
    facts.canonicalSelfReferenceControl.status !== "self"
  ) {
    riskSignals.push("canonical_points_to_different_url");
  }

  if (
    facts.canonicalTargetControl.status === "unknown"
  ) {
    unknownSignals.push("canonical_target_unconfirmed");
  } else if (
    !["not_applicable", "self", "healthy"].includes(facts.canonicalTargetControl.status)
  ) {
    riskSignals.push("canonical_target_needs_attention");
  }

  if (facts.hasLongRedirectChain || facts.redirectChainStatus === "too_many_redirects") {
    riskSignals.push("redirect_chain_is_long");
  }

  if (
    facts.alternateLanguageControl.status !== "none" &&
    facts.alternateLanguageControl.status !== "present"
  ) {
    riskSignals.push("alternate_language_annotations_need_attention");
  }

  if (facts.linkDiscoveryControl.blockedByRelCount > 0) {
    riskSignals.push("internal_link_discovery_is_limited");
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

function toSourceCheck(rule, sourceFacts) {
  const result = rule.check(sourceFacts);

  return {
    ...result,
    metadata: {
      ...(result.metadata ?? {}),
      evidenceSource: "source_html",
      problemFamily: rule.problemFamily,
    },
    category: rule.packId,
    scoreWeight: rule.scoreWeight,
    priority: rule.priority,
    relatedPacks: rule.relatedPacks,
  };
}

function sortChecks(checks) {
  return [...checks]
    .sort((left, right) => {
      // 1. Status ordering
      if (left.status !== right.status) {
        return statusRank(left.status) - statusRank(right.status);
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
    .map(({ priority, relatedPacks, scoreWeight, ...check }) => check);
}

export function evaluateSeoAudit(input) {
  const sourceFacts = deriveFacts(input);
  const renderedFacts = input.renderedDom
    ? deriveFacts({
        ...input.renderedDom,
        requestedUrl: input.requestedUrl,
        finalUrl: input.renderedDom.finalUrl ?? input.finalUrl ?? input.requestedUrl,
      })
    : null;
  const sourceChecks = SORTED_RULES
    .filter((rule) => rule.packId !== "sitewide")
    .map((rule) => toSourceCheck(rule, sourceFacts));
  const sitewideChecks = input.sitewide
    ? SORTED_RULES
        .filter((rule) => rule.packId === "sitewide")
        .map((rule) => toSourceCheck(rule, input.sitewide))
    : [];
  const comparison = compareSurfaces({
    sourceFacts,
    renderedFacts,
    renderedError: input.renderedError,
  });
  const checks = [...sourceChecks, ...sitewideChecks, ...comparison.checks];
  const scoringChecks = [...sourceChecks, ...sitewideChecks, ...comparison.scoringChecks];
  const indexabilityVerdict = deriveIndexabilityVerdict(sourceFacts);
  const scoring = buildWeightedScoreBreakdown(scoringChecks);
  return {
    sourceFacts,
    renderedFacts,
    sourceChecks,
    sitewideChecks,
    comparison,
    checks,
    scoringChecks,
    indexabilityVerdict,
    scoring,
    sitewide: input.sitewide ?? null,
  };
}

export function buildSeoAuditResultFromEvaluation(evaluation) {
  const {
    sourceFacts,
    renderedFacts,
    checks,
    comparison,
    indexabilityVerdict,
    scoring,
    sitewide,
  } = evaluation;
  const sortedChecks = sortChecks(checks);

  return {
    requestedUrl: sourceFacts.requestedUrl,
    finalUrl: sourceFacts.finalUrl ?? sourceFacts.requestedUrl,
    indexabilityVerdict: indexabilityVerdict.verdict,
    score: scoring.overall.score,
    scoring,
    checks: sortedChecks,
    auditDiagnostics: {
      capture: {
        worker: "seo-audit-worker",
        statusCode: sourceFacts.statusCode ?? null,
        contentType: sourceFacts.contentType ?? null,
        capturePasses: renderedFacts ? ["source_html", "rendered_dom"] : ["source_html"],
      },
      surfaces: {
        sourceHtml: {
          wordCount: sourceFacts.sourceWordCount,
          sameOriginCrawlableLinkCount: sourceFacts.sameOriginCrawlableLinkCount,
          nonCrawlableLinkCount: sourceFacts.nonCrawlableLinkCount,
          emptyAnchorTextCount: sourceFacts.emptyAnchorTextCount,
          genericAnchorTextCount: sourceFacts.genericAnchorTextCount,
          metaRefreshTagCount: sourceFacts.metaRefreshTagCount,
          headingOutlineCount: sourceFacts.headingOutlineCount,
          headingHierarchySkipCount: sourceFacts.headingHierarchySkipCount,
          emptyHeadingCount: sourceFacts.emptyHeadingCount,
          repeatedHeadingCount: sourceFacts.repeatedHeadingCount,
          linkedImageCount: sourceFacts.linkedImageCount,
          linkedImageMissingAltCount: sourceFacts.linkedImageMissingAltCount,
          bodyImageCount: sourceFacts.bodyImageCount,
          eligibleBodyImageCount: sourceFacts.eligibleBodyImageCount,
          bodyImageMissingAltCount: sourceFacts.bodyImageMissingAltCount,
          structuredDataKinds: sourceFacts.structuredDataKinds,
        },
        renderedDom: renderedFacts
          ? {
            wordCount: renderedFacts.sourceWordCount,
            sameOriginCrawlableLinkCount: renderedFacts.sameOriginCrawlableLinkCount,
            nonCrawlableLinkCount: renderedFacts.nonCrawlableLinkCount,
            emptyAnchorTextCount: renderedFacts.emptyAnchorTextCount,
            genericAnchorTextCount: renderedFacts.genericAnchorTextCount,
            metaRefreshTagCount: renderedFacts.metaRefreshTagCount,
            headingOutlineCount: renderedFacts.headingOutlineCount,
            headingHierarchySkipCount: renderedFacts.headingHierarchySkipCount,
            emptyHeadingCount: renderedFacts.emptyHeadingCount,
            repeatedHeadingCount: renderedFacts.repeatedHeadingCount,
            linkedImageCount: renderedFacts.linkedImageCount,
            linkedImageMissingAltCount: renderedFacts.linkedImageMissingAltCount,
            bodyImageCount: renderedFacts.bodyImageCount,
            eligibleBodyImageCount: renderedFacts.eligibleBodyImageCount,
            bodyImageMissingAltCount: renderedFacts.bodyImageMissingAltCount,
            structuredDataKinds: renderedFacts.structuredDataKinds,
          }
          : null,
        renderComparison: comparison.summary,
      },
      controls: {
        xRobotsTag: {
          value: sourceFacts.xRobotsTag,
          blocksIndexing: sourceFacts.blocksIndexingViaHeader,
        },
        robotsControl: sourceFacts.robotsControl,
        canonicalControl: sourceFacts.canonicalControl,
        canonicalSelfReferenceControl: sourceFacts.canonicalSelfReferenceControl,
        canonicalTargetControl: sourceFacts.canonicalTargetControl,
        metaRefreshControl: sourceFacts.metaRefreshControl,
        alternateLanguageControl: sourceFacts.alternateLanguageControl,
        linkDiscoveryControl: sourceFacts.linkDiscoveryControl,
        internalLinkCoverageControl: sourceFacts.internalLinkCoverageControl,
        titleControl: sourceFacts.titleControl,
        metaDescriptionControl: sourceFacts.metaDescriptionControl,
        headingControl: sourceFacts.headingControl,
        headingQualityControl: sourceFacts.headingQualityControl,
        bodyImageAltControl: sourceFacts.bodyImageAltControl,
        soft404Control: sourceFacts.soft404Control,
        langControl: sourceFacts.langControl,
        socialMetadataControl: sourceFacts.socialMetadataControl,
        socialUrlControl: sourceFacts.socialUrlControl,
        metadataAlignmentControl: sourceFacts.metadataAlignmentControl,
        robotsPreviewControl: sourceFacts.robotsPreviewControl,
        viewportControl: sourceFacts.viewportControl,
        faviconControl: sourceFacts.faviconControl,
        headHygieneControl: sourceFacts.headHygieneControl,
        structuredDataControl: sourceFacts.structuredDataControl,
        robotsTxt: sourceFacts.robotsTxt,
        redirectChain: sourceFacts.redirectChain,
      },
      sitewide,
      analysis: {
        indexabilitySignals: {
          blockingSignals: indexabilityVerdict.blockingSignals,
          riskSignals: indexabilityVerdict.riskSignals,
          unknownSignals: indexabilityVerdict.unknownSignals,
        },
      },
    },
  };
}

export function normalizeSeoAuditResult(input) {
  return buildSeoAuditResultFromEvaluation(evaluateSeoAudit(input));
}
