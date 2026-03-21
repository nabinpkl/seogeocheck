import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

function formatConflictDetail(conflict) {
  return `${conflict.target} has conflicting ${conflict.field} directives: ${conflict.values.join(", ")}.`;
}

const robotsDirectiveConflicts = defineRule({
  id: "robots-directive-conflicts",
  label: "Robots Directive Conflicts",
  packId: "indexability",
  priority: 4,
  problemFamily: "robots_controls",
  check: (facts) => {
    if (facts.robotsControl.sameTargetConflicts.length === 0) {
      return passedCheck(
        "robots-directive-conflicts",
        "Robots directives are internally consistent",
        "No same-target robots directive conflicts were detected across HTML and HTTP surfaces.",
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-conflicts",
        { conflicts: [] }
      );
    }

    return issueCheck(
      "robots-directive-conflicts",
      "Conflicting robots directives were detected",
      facts.robotsControl.sameTargetConflicts.some((conflict) => conflict.field === "indexing")
        ? "high"
        : "medium",
      "Remove contradictory robots directives so Googlebot receives one clear instruction for indexing and crawling behavior.",
      facts.robotsControl.sameTargetConflicts.map(formatConflictDetail).join(" "),
      'head > meta[name="robots"], head > meta[name="googlebot"], document',
      "robots-conflicts",
      { conflicts: facts.robotsControl.sameTargetConflicts }
    );
  },
});

const robotsIndexing = defineRule({
  id: "robots-indexing",
  label: "Robots Indexing",
  packId: "indexability",
  priority: 5,
  problemFamily: "robots_controls",
  check: (facts) => {
    if (facts.robotsControl.sameTargetConflicts.some((conflict) => conflict.field === "indexing")) {
      return issueCheck(
        "robots-indexing",
        "Resolve indexing conflicts before relying on robots directives",
        "high",
        "Clear the conflicting indexing directives before relying on robots metadata or headers to control indexing.",
        "The audit found contradictory indexing directives for the same crawler target.",
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-effective-indexing",
        {
          effectiveIndexing: facts.robotsControl.effectiveIndexing,
          effectiveTarget: facts.robotsControl.effectiveTarget,
        }
      );
    }

    if (facts.robotsControl.hasBlockingNoindex) {
      const targetedOverride = facts.robotsControl.targetedOverrides.find(
        (override) => override.field === "indexing"
      );
      const detail = targetedOverride
        ? `A crawler-specific indexing override is active: general indexing is ${targetedOverride.generalValue}, but Googlebot is ${targetedOverride.targetedValue}.`
        : `The effective indexing directive for ${facts.robotsControl.effectiveTarget ?? "the evaluated crawler"} is noindex.`;

      return issueCheck(
        "robots-indexing",
        "Robots directives block indexing",
        "high",
        "Remove the blocking noindex directive if this page is meant to appear in Google Search.",
        detail,
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-effective-indexing",
        {
          effectiveIndexing: facts.robotsControl.effectiveIndexing,
          effectiveTarget: facts.robotsControl.effectiveTarget,
          targetedOverrides: facts.robotsControl.targetedOverrides,
        }
      );
    }

    return passedCheck(
      "robots-indexing",
      "Robots directives allow indexing",
      "The effective robots directives do not block indexing for the evaluated crawler.",
      'head > meta[name="robots"], head > meta[name="googlebot"], document',
      "robots-effective-indexing",
      {
        effectiveIndexing: facts.robotsControl.effectiveIndexing,
        effectiveTarget: facts.robotsControl.effectiveTarget,
        targetedOverrides: facts.robotsControl.targetedOverrides,
      }
    );
  },
});

const robotsDirectiveHygiene = defineRule({
  id: "robots-directive-hygiene",
  label: "Robots Directive Hygiene",
  packId: "indexability",
  priority: 6,
  problemFamily: "robots_controls",
  check: (facts) => {
    const problematicTokens = [
      ...facts.robotsControl.unsupportedTokens.map((token) => ({ type: "unsupported", token })),
      ...facts.robotsControl.malformedTokens.map((token) => ({ type: "malformed", token })),
    ];

    if (problematicTokens.length === 0) {
      return passedCheck(
        "robots-directive-hygiene",
        "Robots directives use supported tokens",
        "The audit did not detect unsupported or malformed robots directive tokens.",
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-unsupported-tokens",
        { problematicTokens: [] }
      );
    }

    return issueCheck(
      "robots-directive-hygiene",
      "Clean up unsupported robots directive tokens",
      "low",
      "Remove unsupported or malformed robots directive tokens so indexing controls stay explicit and predictable.",
      `Detected ${problematicTokens.length} problematic robots token${problematicTokens.length === 1 ? "" : "s"}.`,
      'head > meta[name="robots"], head > meta[name="googlebot"], document',
      "robots-unsupported-tokens",
      { problematicTokens }
    );
  },
});

const canonicalSignals = defineRule({
  id: "canonical-signals",
  label: "Canonical Signals",
  packId: "indexability",
  priority: 7,
  problemFamily: "canonical_controls",
  check: (facts) => {
    if (facts.canonicalControl.status === "missing") {
      return issueCheck(
        "canonical-signals",
        "Add a canonical target for this page",
        "medium",
        "Expose one canonical target for this page so crawlers receive a clear preferred URL.",
        null,
        'head > link[rel="canonical"]',
        "canonical-status",
        { canonicalControl: facts.canonicalControl }
      );
    }

    if (facts.canonicalControl.status === "invalid") {
      return issueCheck(
        "canonical-signals",
        "Fix invalid canonical targets",
        "medium",
        "Replace invalid canonical targets with one valid HTTP(S) canonical URL.",
        "All detected canonical targets were invalid, fragment-only, or non-HTTP.",
        'head > link[rel="canonical"]',
        "canonical-status",
        { canonicalControl: facts.canonicalControl }
      );
    }

    if (facts.canonicalControl.status === "multiple") {
      return issueCheck(
        "canonical-signals",
        "Keep one canonical target per surface",
        "medium",
        "Reduce duplicate canonical declarations so each surface exposes one canonical target.",
        `Detected ${facts.canonicalControl.htmlCount} HTML canonical declaration${facts.canonicalControl.htmlCount === 1 ? "" : "s"} and ${facts.canonicalControl.headerCount} HTTP header canonical declaration${facts.canonicalControl.headerCount === 1 ? "" : "s"}.`,
        'head > link[rel="canonical"]',
        "canonical-status",
        { canonicalControl: facts.canonicalControl }
      );
    }

    if (facts.canonicalControl.status === "conflict") {
      return issueCheck(
        "canonical-signals",
        "Canonical targets conflict across surfaces",
        "high",
        "Keep one canonical target across HTML and HTTP headers so crawlers receive a single preferred URL.",
        `Detected ${facts.canonicalControl.uniqueTargetCount} unique canonical targets.`,
        'head > link[rel="canonical"]',
        "canonical-status",
        { canonicalControl: facts.canonicalControl }
      );
    }

    return passedCheck(
      "canonical-signals",
      "Canonical signals are clear",
      "The page exposes one usable canonical target without cross-surface conflicts.",
      'head > link[rel="canonical"]',
      "canonical-status",
      { canonicalControl: facts.canonicalControl }
    );
  },
});

const canonicalIndexabilityConsistency = defineRule({
  id: "canonical-indexability-consistency",
  label: "Canonical Indexability Consistency",
  packId: "indexability",
  priority: 8,
  problemFamily: "canonical_controls",
  check: (facts) => {
    if (!facts.canonicalControl.resolvedCanonicalUrl) {
      return passedCheck(
        "canonical-indexability-consistency",
        "Canonical consistency is not applicable yet",
        "A valid canonical target is not available yet, so self-consistency cannot be evaluated.",
        'head > link[rel="canonical"]',
        "canonical-final-url",
        { canonicalControl: facts.canonicalControl, finalUrl: facts.finalUrl }
      );
    }

    if (facts.canonicalControl.consistency === "contradicts") {
      return issueCheck(
        "canonical-indexability-consistency",
        "Canonical target differs from the final page URL",
        "high",
        "Point the canonical target at the final page URL if this page is the version you want indexed.",
        `The canonical target resolves to ${facts.canonicalControl.resolvedCanonicalUrl}, while the final page URL is ${facts.finalUrl}.`,
        'head > link[rel="canonical"]',
        "canonical-final-url",
        { canonicalControl: facts.canonicalControl, finalUrl: facts.finalUrl }
      );
    }

    return passedCheck(
      "canonical-indexability-consistency",
      "Canonical target aligns with the final page URL",
      "The canonical target resolves to the final page URL.",
      'head > link[rel="canonical"]',
      "canonical-final-url",
      { canonicalControl: facts.canonicalControl, finalUrl: facts.finalUrl }
    );
  },
});

const robotsTxtCrawlability = defineRule({
  id: "robots-txt-crawlability",
  label: "robots.txt Crawlability",
  packId: "indexability",
  priority: 9,
  problemFamily: "robots_txt",
  check: (facts) => {
    if (facts.robotsTxtAllowsCrawl === false) {
      return issueCheck(
        "robots-txt-crawlability",
        "Allow crawling for this URL in robots.txt",
        "high",
        "Update robots.txt so Googlebot can crawl this exact URL if the page is meant to be indexed.",
        facts.robotsTxt.matchedPattern
          ? `robots.txt blocks this URL for ${facts.robotsTxt.evaluatedUserAgent ?? "the evaluated crawler"} with ${facts.robotsTxt.matchedDirective}: ${facts.robotsTxt.matchedPattern}.`
          : "robots.txt blocks this URL.",
        "document",
        "robots-txt",
        { robotsTxt: facts.robotsTxt }
      );
    }

    if (facts.robotsTxtAllowsCrawl === null) {
      return issueCheck(
        "robots-txt-crawlability",
        "Make robots.txt crawl rules reachable for this URL",
        "low",
        "Return a readable robots.txt file so crawl permissions for this URL can be confirmed reliably.",
        facts.robotsTxt.fetchStatusCode
          ? `The robots.txt request returned HTTP ${facts.robotsTxt.fetchStatusCode}.`
          : "The audit could not confirm robots.txt rules for this URL.",
        "document",
        "robots-txt",
        { robotsTxt: facts.robotsTxt }
      );
    }

    return passedCheck(
      "robots-txt-crawlability",
      "robots.txt allows crawling this URL",
      facts.robotsTxt.status === "missing"
        ? "No robots.txt file was found, so crawling is not blocked for this URL."
        : "The evaluated robots.txt rules allow this URL to be crawled.",
      "document",
      "robots-txt",
      { robotsTxt: facts.robotsTxt }
    );
  },
});

const redirectChainClarity = defineRule({
  id: "redirect-chain-clarity",
  label: "Redirect Chain Clarity",
  packId: "indexability",
  priority: 10,
  problemFamily: "redirect_chain",
  check: (facts) => {
    if (facts.redirectChainStatus === "unavailable") {
      return issueCheck(
        "redirect-chain-clarity",
        "Return a verifiable redirect path to the final page URL",
        "low",
        "Make the redirect path to the final page URL readable so the audit can confirm how crawlers reach the indexable destination.",
        facts.redirectChain.error ?? "The audit could not verify the redirect chain for this URL.",
        "document",
        "redirect-chain",
        { redirectChain: facts.redirectChain }
      );
    }

    if (facts.redirectChainStatus === "too_many_redirects" || facts.hasLongRedirectChain) {
      return issueCheck(
        "redirect-chain-clarity",
        "Shorten the redirect chain before the final page URL",
        "medium",
        "Reduce unnecessary redirects so crawlers reach the final page URL with fewer hops.",
        `Detected ${facts.redirectCount} redirect${facts.redirectCount === 1 ? "" : "s"} before the final URL.`,
        "document",
        "redirect-chain",
        { redirectChain: facts.redirectChain }
      );
    }

    return passedCheck(
      "redirect-chain-clarity",
      facts.redirectCount === 0 ? "No redirects before the final URL" : "Redirect chain resolves cleanly",
      facts.redirectCount === 0
        ? "The requested URL returned the final page directly."
        : `The requested URL resolves to the final page in ${facts.redirectCount} redirect${facts.redirectCount === 1 ? "" : "s"}.`,
      "document",
      "redirect-chain",
      { redirectChain: facts.redirectChain }
    );
  },
});

const alternateLanguageSignals = defineRule({
  id: "alternate-language-signals",
  label: "Alternate Language Signals",
  packId: "metadata",
  priority: 11,
  problemFamily: "alternate_language_controls",
  check: (facts) => {
    if (facts.alternateLanguageControl.status === "none") {
      return passedCheck(
        "alternate-language-signals",
        "No alternate language annotations are required here",
        "No hreflang-based alternate language annotations were detected, which is acceptable for pages without localized variants.",
        'head > link[rel="alternate"]',
        "alternate-language-status",
        { alternateLanguageControl: facts.alternateLanguageControl }
      );
    }

    if (facts.alternateLanguageControl.status === "conflict") {
      return issueCheck(
        "alternate-language-signals",
        "Alternate language targets conflict",
        "medium",
        "Keep each hreflang value mapped to one clear target URL across HTML and HTTP headers.",
        `Detected conflicting targets for ${facts.alternateLanguageControl.conflicts.length} hreflang annotation${facts.alternateLanguageControl.conflicts.length === 1 ? "" : "s"}.`,
        'head > link[rel="alternate"]',
        "alternate-language-status",
        { alternateLanguageControl: facts.alternateLanguageControl }
      );
    }

    if (
      facts.alternateLanguageControl.status === "invalid" ||
      facts.alternateLanguageControl.status === "incomplete"
    ) {
      return issueCheck(
        "alternate-language-signals",
        "Fix invalid alternate language annotations",
        "medium",
        "Repair invalid hreflang annotations so each alternate language link points to a valid target.",
        `Detected ${facts.alternateLanguageControl.invalidAnnotations.length} invalid or incomplete hreflang annotation${facts.alternateLanguageControl.invalidAnnotations.length === 1 ? "" : "s"}.`,
        'head > link[rel="alternate"]',
        "alternate-language-status",
        { alternateLanguageControl: facts.alternateLanguageControl }
      );
    }

    return passedCheck(
      "alternate-language-signals",
      "Alternate language annotations are consistent",
      "Detected hreflang annotations without invalid targets or cross-surface conflicts.",
      'head > link[rel="alternate"]',
      "alternate-language-status",
      { alternateLanguageControl: facts.alternateLanguageControl }
    );
  },
});

const htmlLang = defineRule({
  id: "html-lang",
  label: "HTML Language",
  packId: "crawlability",
  priority: 25,
  problemFamily: "html_lang",
  check: (facts) => {
    return facts.lang
      ? passedCheck(
          "html-lang",
          "HTML language is declared",
          "The HTML response before rendering declares its document language.",
          "html",
          null,
          { lang: facts.lang }
        )
      : issueCheck(
          "html-lang",
          "Declare the page language in the HTML response before rendering",
          "low",
          "Add a lang attribute in the HTML response before rendering to clarify language targeting without relying on rendered JavaScript.",
          null,
          "html",
          null,
          { lang: null }
        );
  },
});

const sourceCrawlableLinks = defineRule({
  id: "source-crawlable-links",
  label: "Source Crawlable Links",
  packId: "crawlability",
  priority: 12,
  problemFamily: "source_link_presence",
  check: (facts) => {
    return facts.sameOriginCrawlableLinkCount > 0
      ? passedCheck(
          "source-crawlable-links",
          "Source HTML includes crawlable internal links",
          "The HTML response before rendering exposes at least one same-origin crawlable link.",
          "a[href]",
          "same-origin-crawlable-links",
          { sameOriginCrawlableLinkCount: facts.sameOriginCrawlableLinkCount }
        )
      : issueCheck(
          "source-crawlable-links",
          "Add crawlable internal links in the HTML response before rendering",
          "high",
          "Expose important internal links as real <a href> elements in the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
          "No same-origin crawlable links were found in source HTML.",
          "a[href]",
          "same-origin-crawlable-links",
          {
            sameOriginCrawlableLinkCount: facts.sameOriginCrawlableLinkCount,
            nonCrawlableLinkCount: facts.nonCrawlableLinkCount,
          }
        );
  },
});

const internalLinkRelDiscovery = defineRule({
  id: "internal-link-rel-discovery",
  label: "Internal Link Discovery",
  packId: "crawlability",
  priority: 13,
  problemFamily: "internal_link_discovery",
  check: (facts) => {
    if (facts.linkDiscoveryControl.blockedByRelCount === 0) {
      return passedCheck(
        "internal-link-rel-discovery",
        "Internal discovery links are not blocked by rel attributes",
        "Internal crawlable links are not marked with rel values that can suppress discovery.",
        "a[href]",
        "internal-link-rel-blockers",
        { linkDiscoveryControl: facts.linkDiscoveryControl }
      );
    }

    const severity = facts.linkDiscoveryControl.status === "systemic" ? "medium" : "low";

    return issueCheck(
      "internal-link-rel-discovery",
      "Internal discovery links are blocked by rel attributes",
      severity,
      "Remove nofollow-style rel attributes from internal discovery links that should help Google discover important pages.",
      `Detected ${facts.linkDiscoveryControl.blockedByRelCount} internal crawlable link${facts.linkDiscoveryControl.blockedByRelCount === 1 ? "" : "s"} with discovery-limiting rel values.`,
      "a[href]",
      "internal-link-rel-blockers",
      { linkDiscoveryControl: facts.linkDiscoveryControl }
    );
  },
});

const anchorTextQuality = defineRule({
  id: "anchor-text-quality",
  label: "Anchor Text Quality",
  packId: "crawlability",
  priority: 18,
  problemFamily: "anchor_text_quality",
  check: (facts) => {
    if (facts.emptyAnchorTextCount > 0) {
      return issueCheck(
        "anchor-text-quality",
        "Add descriptive anchor text in the HTML response before rendering",
        "medium",
        "Give important links descriptive text in the HTML response before rendering so crawlers and users can understand their destination without relying on rendered JavaScript.",
        `Detected ${facts.emptyAnchorTextCount} source link${facts.emptyAnchorTextCount === 1 ? "" : "s"} with empty anchor text.`,
        "a[href]",
        "empty-anchor-text",
        {
          emptyAnchorTextCount: facts.emptyAnchorTextCount,
          genericAnchorTextCount: facts.genericAnchorTextCount,
        }
      );
    }

    return facts.genericAnchorTextCount > 0
      ? issueCheck(
          "anchor-text-quality",
          "Strengthen generic anchor text in the HTML response before rendering",
          "low",
          "Replace generic source link text like \"read more\" with destination-specific wording in the HTML response before rendering.",
          `Detected ${facts.genericAnchorTextCount} source link${facts.genericAnchorTextCount === 1 ? "" : "s"} with generic anchor text.`,
          "a[href]",
          "generic-anchor-text",
          {
            emptyAnchorTextCount: facts.emptyAnchorTextCount,
            genericAnchorTextCount: facts.genericAnchorTextCount,
          }
        )
      : passedCheck(
          "anchor-text-quality",
          "Anchor text is descriptive",
          "The source HTML before rendering uses descriptive anchor text for crawlable links.",
          "a[href]",
          "generic-anchor-text",
          {
            emptyAnchorTextCount: facts.emptyAnchorTextCount,
            genericAnchorTextCount: facts.genericAnchorTextCount,
          }
        );
  },
});

const fragmentRouteHygiene = defineRule({
  id: "fragment-route-hygiene",
  label: "Fragment Route Hygiene",
  packId: "crawlability",
  priority: 22,
  problemFamily: "fragment_routes",
  check: (facts) => {
    const problematicLinks = facts.sourceAnchors.filter(
      (anchor) =>
        anchor.usesJavascriptHref || (anchor.isFragmentOnly && !anchor.hasMatchingFragmentTarget)
    );

    return problematicLinks.length > 0
      ? issueCheck(
          "fragment-route-hygiene",
          "Use crawlable route URLs in the HTML response before rendering",
          "low",
          "Use real crawlable URLs in the HTML response before rendering instead of javascript: handlers or fragment-only routes for navigational links.",
          `Detected ${problematicLinks.length} source link${problematicLinks.length === 1 ? "" : "s"} that rely on javascript: or fragment-only routing.`,
          "a[href]",
          "non-crawlable-routes",
          { problematicLinkCount: problematicLinks.length }
        )
      : passedCheck(
          "fragment-route-hygiene",
          "Source routes use crawlable URLs",
          "The source HTML before rendering uses crawlable URLs for navigational links.",
          "a[href]",
          "non-crawlable-routes",
          { problematicLinkCount: 0 }
        );
  },
});

export const crawlabilityRules = [
  robotsDirectiveConflicts,
  robotsIndexing,
  robotsDirectiveHygiene,
  canonicalSignals,
  canonicalIndexabilityConsistency,
  robotsTxtCrawlability,
  redirectChainClarity,
  alternateLanguageSignals,
  htmlLang,
  sourceCrawlableLinks,
  internalLinkRelDiscovery,
  anchorTextQuality,
  fragmentRouteHygiene,
];
