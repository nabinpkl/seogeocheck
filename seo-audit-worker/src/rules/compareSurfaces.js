import { issueCheck } from "./utils.js";

function comparisonCheck(id, label, severity, instruction, detail, selector, metric, metadata, priority) {
  return {
    ...issueCheck(id, label, severity, instruction, detail, selector, metric, metadata),
    category: "discovery",
    priority,
    relatedPacks: [],
    metadata: {
      ...(metadata ?? {}),
      evidenceSource: "surface_comparison",
      problemFamily: "render_dependency",
    },
  };
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

export function compareSurfaces({ sourceFacts, renderedFacts, renderedError }) {
  if (!renderedFacts) {
    return {
      checks: renderedError
        ? [
            comparisonCheck(
              "rendered-pass-unavailable",
              "Rendered DOM comparison was unavailable",
              "low",
              "We could not complete the rendered DOM comparison for this page, so these findings rely on the HTML response before rendering.",
              renderedError?.message ?? "The rendered pass did not return comparable signals.",
              "document",
              "rendered-pass",
              null,
              95
            ),
          ]
        : [],
      summary: buildSummary({
        sourceOnlyCriticalIssues: 0,
        renderedOnlySignals: 0,
        mismatches: 0,
        renderedAvailable: false,
      }),
    };
  }

  const checks = [];
  let sourceOnlyCriticalIssues = 0;
  let renderedOnlySignals = 0;
  let mismatches = 0;

  if (sourceFacts.sourceWordCount < 20 && renderedFacts.sourceWordCount >= 20) {
    sourceOnlyCriticalIssues += 1;
    checks.push(
      comparisonCheck(
        "rendered-visible-text",
        "Critical text appears only after rendering",
        "high",
        "Move meaningful body text into the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
        `Source HTML exposed about ${sourceFacts.sourceWordCount} words, while the rendered DOM exposed about ${renderedFacts.sourceWordCount}.`,
        "body",
        "rendered-word-count",
        {
          sourceWordCount: sourceFacts.sourceWordCount,
          renderedWordCount: renderedFacts.sourceWordCount,
        },
        10
      )
    );
  }

  if (
    sourceFacts.sameOriginCrawlableLinkCount === 0 &&
    renderedFacts.sameOriginCrawlableLinkCount > 0
  ) {
    sourceOnlyCriticalIssues += 1;
    checks.push(
      comparisonCheck(
        "rendered-crawlable-links",
        "Critical links appear only after rendering",
        "high",
        "Expose important internal links as real <a href> elements in the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
        `Source HTML exposed ${sourceFacts.sameOriginCrawlableLinkCount} same-origin crawlable links, while the rendered DOM exposed ${renderedFacts.sameOriginCrawlableLinkCount}.`,
        "a[href]",
        "rendered-same-origin-links",
        {
          sourceSameOriginCrawlableLinkCount: sourceFacts.sameOriginCrawlableLinkCount,
          renderedSameOriginCrawlableLinkCount: renderedFacts.sameOriginCrawlableLinkCount,
        },
        11
      )
    );
  }

  if (!sourceFacts.hasStructuredDataInSource && renderedFacts.hasStructuredDataInSource) {
    renderedOnlySignals += 1;
    checks.push(
      comparisonCheck(
        "rendered-structured-data",
        "Structured data appears only after rendering",
        "low",
        "Prefer exposing structured data in the HTML response before rendering when this page qualifies for rich results.",
        `Rendered DOM exposed ${renderedFacts.structuredDataKinds.join(", ")}, while source HTML did not expose structured data.`,
        'script[type="application/ld+json"], [itemscope], [typeof]',
        "rendered-structured-data",
        {
          sourceStructuredDataKinds: sourceFacts.structuredDataKinds,
          renderedStructuredDataKinds: renderedFacts.structuredDataKinds,
        },
        40
      )
    );
  }

  if (
    sourceFacts.metaDescription &&
    renderedFacts.metaDescription &&
    sourceFacts.metaDescription !== renderedFacts.metaDescription
  ) {
    mismatches += 1;
    checks.push(
      comparisonCheck(
        "rendered-meta-description-mismatch",
        "Source and rendered meta descriptions do not match",
        "low",
        "Keep the meta description aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent summary.",
        `Source HTML used "${sourceFacts.metaDescription}", while the rendered DOM used "${renderedFacts.metaDescription}".`,
        'head > meta[name="description"]',
        "rendered-meta-description",
        {
          sourceMetaDescription: sourceFacts.metaDescription,
          renderedMetaDescription: renderedFacts.metaDescription,
        },
        60
      )
    );
  }

  if (
    sourceFacts.title &&
    renderedFacts.title &&
    sourceFacts.title !== renderedFacts.title
  ) {
    mismatches += 1;
    checks.push(
      comparisonCheck(
        "rendered-title-mismatch",
        "Source and rendered titles do not match",
        "medium",
        "Keep the page title aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent title.",
        `Source HTML used "${sourceFacts.title}", while the rendered DOM used "${renderedFacts.title}".`,
        "head > title",
        "rendered-title",
        {
          sourceTitle: sourceFacts.title,
          renderedTitle: renderedFacts.title,
        },
        55
      )
    );
  }

  if (
    sourceFacts.canonicalStatus === "valid" &&
    renderedFacts.canonicalStatus === "valid" &&
    sourceFacts.resolvedCanonicalUrl !== renderedFacts.resolvedCanonicalUrl
  ) {
    mismatches += 1;
    checks.push(
      comparisonCheck(
        "rendered-canonical-mismatch",
        "Source and rendered canonicals do not match",
        "medium",
        "Keep the canonical URL aligned between the HTML response before rendering and the rendered DOM so search engines see one consistent preferred URL.",
        `Source HTML used "${sourceFacts.resolvedCanonicalUrl}", while the rendered DOM used "${renderedFacts.resolvedCanonicalUrl}".`,
        'head > link[rel="canonical"]',
        "rendered-canonical",
        {
          sourceCanonicalUrl: sourceFacts.resolvedCanonicalUrl,
          renderedCanonicalUrl: renderedFacts.resolvedCanonicalUrl,
        },
        58
      )
    );
  }

  if (sourceFacts.robotsContent !== renderedFacts.robotsContent) {
    mismatches += 1;
    checks.push(
      comparisonCheck(
        "rendered-robots-mismatch",
        "Source and rendered robots directives do not match",
        "medium",
        "Keep robots directives aligned between the HTML response before rendering and the rendered DOM so indexing intent stays consistent.",
        `Source HTML used "${sourceFacts.robotsContent ?? "none"}", while the rendered DOM used "${renderedFacts.robotsContent ?? "none"}".`,
        'head > meta[name="robots"]',
        "rendered-robots",
        {
          sourceRobotsContent: sourceFacts.robotsContent,
          renderedRobotsContent: renderedFacts.robotsContent,
        },
        59
      )
    );
  }

  if (!sourceFacts.hasPrimaryHeading && renderedFacts.hasPrimaryHeading) {
    renderedOnlySignals += 1;
    checks.push(
      comparisonCheck(
        "rendered-primary-heading",
        "Primary heading appears only after rendering",
        "medium",
        "Move the primary heading into the HTML response before rendering so the page topic is visible without relying on JavaScript.",
        "Source HTML did not expose a primary heading, but the rendered DOM did.",
        "body h1",
        "rendered-h1",
        {
          sourceH1Count: sourceFacts.h1Count,
          renderedH1Count: renderedFacts.h1Count,
        },
        35
      )
    );
  }

  return {
    checks,
    summary: buildSummary({
      sourceOnlyCriticalIssues,
      renderedOnlySignals,
      mismatches,
      renderedAvailable: true,
    }),
  };
}
