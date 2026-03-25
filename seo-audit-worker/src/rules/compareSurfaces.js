import { issueCheck, passedCheck, systemErrorCheck } from "./utils.js";

function withDiscoveryMetadata(metadata) {
  return {
    ...(metadata ?? {}),
    evidenceSource: "surface_comparison",
    problemFamily: "render_dependency",
  };
}

function buildDiscoveryCheck(rule, result) {
  return {
    ...result,
    category: "discovery",
    scoreWeight: rule.scoreWeight,
    priority: rule.priority,
    relatedPacks: [],
    metadata: withDiscoveryMetadata(result.metadata),
  };
}

function buildDiscoveryIssueCheck(
  rule,
  severity,
  instruction,
  detail,
  selector,
  metric,
  metadata
) {
  return buildDiscoveryCheck(
    rule,
    issueCheck(rule.id, rule.label, severity, instruction, detail, selector, metric, metadata)
  );
}

function buildDiscoveryPassedCheck(rule, detail, selector, metric, metadata) {
  return buildDiscoveryCheck(
    rule,
    passedCheck(rule.id, rule.label, detail, selector, metric, metadata)
  );
}

function buildDiscoverySystemErrorCheck(rule, detail, selector, metric, metadata, instruction) {
  return buildDiscoveryCheck(
    rule,
    systemErrorCheck(rule.id, rule.label, detail, selector, metric, metadata, instruction)
  );
}

function buildSummary({ sourceOnlyCriticalIssues, renderedOnlySignals, mismatches, renderedAvailable }) {
  if (!renderedAvailable) {
    return {
      sourceOnlyCriticalIssues: 0,
      renderedOnlySignals: 0,
      mismatches: 0,
      renderDependencyRisk: "unknown",
    };
  }

  const renderDependencyRisk =
    sourceOnlyCriticalIssues > 0
      ? "high"
      : renderedOnlySignals > 0 || mismatches > 0
        ? "medium"
        : "low";

  return {
    sourceOnlyCriticalIssues,
    renderedOnlySignals,
    mismatches,
    renderDependencyRisk,
  };
}

function renderedUnavailableReason(renderedError) {
  return renderedError?.message?.toLowerCase().includes("timeout")
    ? "timeout"
    : "upstream_fetch_failed";
}

export const DISCOVERY_RULES = [
  {
    id: "rendered-visible-text",
    label: "Critical text appears only after rendering",
    scoreWeight: 5,
    priority: 10,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.sourceWordCount < 20 && renderedFacts.sourceWordCount >= 20
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[0],
            "high",
            "Move meaningful body text into the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
            `Source HTML exposed about ${sourceFacts.sourceWordCount} words, while the rendered DOM exposed about ${renderedFacts.sourceWordCount}.`,
            "body",
            "rendered-word-count",
            {
              sourceWordCount: sourceFacts.sourceWordCount,
              renderedWordCount: renderedFacts.sourceWordCount,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[0],
            "Critical body text is already present in the HTML response before rendering.",
            "body",
            "rendered-word-count",
            {
              sourceWordCount: sourceFacts.sourceWordCount,
              renderedWordCount: renderedFacts.sourceWordCount,
            }
          ),
  },
  {
    id: "rendered-crawlable-links",
    label: "Critical links appear only after rendering",
    scoreWeight: 5,
    priority: 11,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.sameOriginCrawlableLinkCount === 0 &&
      renderedFacts.sameOriginCrawlableLinkCount > 0
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[1],
            "high",
            "Expose important internal links as real <a href> elements in the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
            `Source HTML exposed ${sourceFacts.sameOriginCrawlableLinkCount} same-origin crawlable links, while the rendered DOM exposed ${renderedFacts.sameOriginCrawlableLinkCount}.`,
            "a[href]",
            "rendered-same-origin-links",
            {
              sourceSameOriginCrawlableLinkCount: sourceFacts.sameOriginCrawlableLinkCount,
              renderedSameOriginCrawlableLinkCount: renderedFacts.sameOriginCrawlableLinkCount,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[1],
            "Discovery-critical internal links are already present in source HTML.",
            "a[href]",
            "rendered-same-origin-links",
            {
              sourceSameOriginCrawlableLinkCount: sourceFacts.sameOriginCrawlableLinkCount,
              renderedSameOriginCrawlableLinkCount: renderedFacts.sameOriginCrawlableLinkCount,
            }
          ),
  },
  {
    id: "rendered-primary-heading",
    label: "Primary heading appears only after rendering",
    scoreWeight: 2,
    priority: 35,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      !sourceFacts.hasPrimaryHeading && renderedFacts.hasPrimaryHeading
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[2],
            "medium",
            "Move the primary heading into the HTML response before rendering so the page topic is visible without relying on JavaScript.",
            "Source HTML did not expose a primary heading, but the rendered DOM did.",
            "body h1",
            "rendered-h1",
            {
              sourceH1Count: sourceFacts.h1Count,
              renderedH1Count: renderedFacts.h1Count,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[2],
            "The primary heading does not depend on rendering in this pass.",
            "body h1",
            "rendered-h1",
            {
              sourceH1Count: sourceFacts.h1Count,
              renderedH1Count: renderedFacts.h1Count,
            }
          ),
  },
  {
    id: "rendered-structured-data",
    label: "Structured data appears only after rendering",
    scoreWeight: 1,
    priority: 40,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      !sourceFacts.hasStructuredDataInSource && renderedFacts.hasStructuredDataInSource
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[3],
            "low",
            "Prefer exposing structured data in the HTML response before rendering when this page qualifies for rich results.",
            `Rendered DOM exposed ${renderedFacts.structuredDataKinds.join(", ")}, while source HTML did not expose structured data.`,
            'script[type="application/ld+json"], [itemscope], [typeof]',
            "rendered-structured-data",
            {
              sourceStructuredDataKinds: sourceFacts.structuredDataKinds,
              renderedStructuredDataKinds: renderedFacts.structuredDataKinds,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[3],
            "Structured data does not depend on rendering in this pass.",
            'script[type="application/ld+json"], [itemscope], [typeof]',
            "rendered-structured-data",
            {
              sourceStructuredDataKinds: sourceFacts.structuredDataKinds,
              renderedStructuredDataKinds: renderedFacts.structuredDataKinds,
            }
          ),
  },
  {
    id: "rendered-title-mismatch",
    label: "Source and rendered titles do not match",
    scoreWeight: 3,
    priority: 55,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.title &&
      renderedFacts.title &&
      sourceFacts.title !== renderedFacts.title
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[4],
            "medium",
            "Keep the page title aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent title.",
            `Source HTML used "${sourceFacts.title}", while the rendered DOM used "${renderedFacts.title}".`,
            "head > title",
            "rendered-title",
            {
              sourceTitle: sourceFacts.title,
              renderedTitle: renderedFacts.title,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[4],
            "Source and rendered titles are aligned in this pass.",
            "head > title",
            "rendered-title",
            {
              sourceTitle: sourceFacts.title ?? null,
              renderedTitle: renderedFacts.title ?? null,
            }
          ),
  },
  {
    id: "rendered-canonical-mismatch",
    label: "Source and rendered canonicals do not match",
    scoreWeight: 3,
    priority: 58,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.canonicalStatus === "valid" &&
      renderedFacts.canonicalStatus === "valid" &&
      sourceFacts.resolvedCanonicalUrl !== renderedFacts.resolvedCanonicalUrl
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[5],
            "medium",
            "Keep the canonical URL aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent preferred URL.",
            `Source HTML used "${sourceFacts.resolvedCanonicalUrl}", while the rendered DOM used "${renderedFacts.resolvedCanonicalUrl}".`,
            'head > link[rel="canonical"]',
            "rendered-canonical",
            {
              sourceCanonicalUrl: sourceFacts.resolvedCanonicalUrl,
              renderedCanonicalUrl: renderedFacts.resolvedCanonicalUrl,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[5],
            "Source and rendered canonical URLs are aligned in this pass.",
            'head > link[rel="canonical"]',
            "rendered-canonical",
            {
              sourceCanonicalUrl: sourceFacts.resolvedCanonicalUrl ?? null,
              renderedCanonicalUrl: renderedFacts.resolvedCanonicalUrl ?? null,
            }
          ),
  },
  {
    id: "rendered-robots-mismatch",
    label: "Source and rendered robots directives do not match",
    scoreWeight: 3,
    priority: 59,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.robotsContent !== renderedFacts.robotsContent
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[6],
            "medium",
            "Keep robots directives aligned between the HTML response before rendering and the rendered DOM so indexing intent stays consistent.",
            `Source HTML used "${sourceFacts.robotsContent ?? "none"}", while the rendered DOM used "${renderedFacts.robotsContent ?? "none"}".`,
            'head > meta[name="robots"]',
            "rendered-robots",
            {
              sourceRobotsContent: sourceFacts.robotsContent,
              renderedRobotsContent: renderedFacts.robotsContent,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[6],
            "Source and rendered robots directives are aligned in this pass.",
            'head > meta[name="robots"]',
            "rendered-robots",
            {
              sourceRobotsContent: sourceFacts.robotsContent ?? null,
              renderedRobotsContent: renderedFacts.robotsContent ?? null,
            }
          ),
  },
  {
    id: "rendered-meta-description-mismatch",
    label: "Source and rendered meta descriptions do not match",
    scoreWeight: 2,
    priority: 60,
    evaluate: ({ sourceFacts, renderedFacts }) =>
      sourceFacts.metaDescription &&
      renderedFacts.metaDescription &&
      sourceFacts.metaDescription !== renderedFacts.metaDescription
        ? buildDiscoveryIssueCheck(
            DISCOVERY_RULES[7],
            "low",
            "Keep the meta description aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent summary.",
            `Source HTML used "${sourceFacts.metaDescription}", while the rendered DOM used "${renderedFacts.metaDescription}".`,
            'head > meta[name="description"]',
            "rendered-meta-description",
            {
              sourceMetaDescription: sourceFacts.metaDescription,
              renderedMetaDescription: renderedFacts.metaDescription,
            }
          )
        : buildDiscoveryPassedCheck(
            DISCOVERY_RULES[7],
            "Source and rendered meta descriptions are aligned in this pass.",
            'head > meta[name="description"]',
            "rendered-meta-description",
            {
              sourceMetaDescription: sourceFacts.metaDescription ?? null,
              renderedMetaDescription: renderedFacts.metaDescription ?? null,
            }
          ),
  },
];

function buildUnavailableScoringChecks(renderedError) {
  const reasonCode = renderedUnavailableReason(renderedError);
  const detail =
    renderedError?.message ?? "The rendered DOM pass did not return comparable signals.";

  return DISCOVERY_RULES.map((rule) =>
    buildDiscoverySystemErrorCheck(
      rule,
      detail,
      "document",
      "rendered-pass",
      {
        reasonCode,
        retryable: true,
      },
      "Retry this audit to re-run the rendered DOM comparison."
    )
  );
}

export function compareSurfaces({ sourceFacts, renderedFacts, renderedError }) {
  if (!renderedFacts) {
    return {
      checks: renderedError
        ? [
            buildDiscoveryCheck(
              { scoreWeight: 0, priority: 0 },
              systemErrorCheck(
                "rendered-pass-unavailable",
                "Rendered DOM comparison was unavailable",
                renderedError?.message ?? "The rendered DOM pass did not return comparable signals.",
                "document",
                "rendered-pass",
                {
                  reasonCode: renderedUnavailableReason(renderedError),
                  retryable: true,
                },
                "Retry this audit to re-run the rendered DOM comparison."
              )
            ),
          ]
        : [],
      scoringChecks: buildUnavailableScoringChecks(renderedError),
      summary: buildSummary({
        sourceOnlyCriticalIssues: 0,
        renderedOnlySignals: 0,
        mismatches: 0,
        renderedAvailable: false,
      }),
    };
  }

  const scoringChecks = DISCOVERY_RULES.map((rule) =>
    rule.evaluate({ sourceFacts, renderedFacts })
  );
  const sourceOnlyCriticalIssues = scoringChecks.filter((check) =>
    ["rendered-visible-text", "rendered-crawlable-links"].includes(check.id) &&
    check.status === "issue"
  ).length;
  const renderedOnlySignals = scoringChecks.filter((check) =>
    ["rendered-primary-heading", "rendered-structured-data"].includes(check.id) &&
    check.status === "issue"
  ).length;
  const mismatches = scoringChecks.filter((check) =>
    [
      "rendered-title-mismatch",
      "rendered-canonical-mismatch",
      "rendered-robots-mismatch",
      "rendered-meta-description-mismatch",
    ].includes(check.id) && check.status === "issue"
  ).length;

  return {
    checks: scoringChecks,
    scoringChecks,
    summary: buildSummary({
      sourceOnlyCriticalIssues,
      renderedOnlySignals,
      mismatches,
      renderedAvailable: true,
    }),
  };
}
