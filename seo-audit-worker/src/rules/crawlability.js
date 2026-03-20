import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const canonicalUrl = defineRule({
  id: "canonical-url",
  label: "Canonical URL",
  packId: "indexability",
  priority: 5,
  relatedPacks: [],
  check: (facts) => {
    if (facts.canonicalStatus === "valid") {
      return passedCheck(
        "canonical-url",
        "Canonical URL is present",
        "The page declares a canonical URL in the HTML response before rendering.",
        'head > link[rel="canonical"]',
        null,
        { canonicalUrl: facts.resolvedCanonicalUrl ?? facts.canonicalUrl }
      );
    }

    const detailByStatus = {
      missing: null,
      invalid: "The canonical href could not be resolved as a valid URL.",
      "fragment-only": "The canonical href points to a fragment instead of a crawlable URL.",
      "non-http": "The canonical href resolved to a non-HTTP(S) URL.",
    };

    return issueCheck(
      "canonical-url",
      "Add a sane canonical URL in the HTML response before rendering",
      "medium",
      "Add a canonical link element in the HTML response before rendering so search engines can understand the preferred version of this page without relying on rendered JavaScript.",
      detailByStatus[facts.canonicalStatus] ?? null,
      'head > link[rel="canonical"]',
      null,
      { canonicalUrl: facts.canonicalUrl, canonicalStatus: facts.canonicalStatus }
    );
  },
});

const canonicalIndexabilityConsistency = defineRule({
  id: "canonical-indexability-consistency",
  label: "Canonical Indexability Consistency",
  packId: "indexability",
  priority: 6,
  relatedPacks: [],
  check: (facts) => {
    if (facts.canonicalConsistency === "self") {
      return passedCheck(
        "canonical-indexability-consistency",
        "Canonical aligns with the final URL",
        "The canonical URL matches the final crawlable page URL.",
        'head > link[rel="canonical"]',
        "canonical-final-url",
        {
          canonicalUrl: facts.resolvedCanonicalUrl,
          finalUrl: facts.finalUrl,
        }
      );
    }

    if (facts.canonicalConsistency === "contradicts") {
      return issueCheck(
        "canonical-indexability-consistency",
        "Point the canonical URL at the page you want indexed",
        "high",
        "Update the canonical URL so it points at the final page URL if this page is meant to be indexed.",
        `The canonical URL resolves to ${facts.resolvedCanonicalUrl}, while the final page URL is ${facts.finalUrl}.`,
        'head > link[rel="canonical"]',
        "canonical-final-url",
        {
          canonicalUrl: facts.resolvedCanonicalUrl,
          finalUrl: facts.finalUrl,
        }
      );
    }

    return issueCheck(
      "canonical-indexability-consistency",
      "Add a valid canonical URL before relying on canonical self-consistency",
      "low",
      "Expose a valid canonical URL in the HTML response before rendering so the preferred indexable URL is explicit.",
      "Canonical self-consistency could not be confirmed because the canonical URL is missing or invalid.",
      'head > link[rel="canonical"]',
      "canonical-final-url",
      {
        canonicalStatus: facts.canonicalStatus,
        finalUrl: facts.finalUrl,
      }
    );
  },
});

const xRobotsIndexing = defineRule({
  id: "x-robots-indexing",
  label: "X-Robots-Tag Indexing",
  packId: "indexability",
  priority: 7,
  relatedPacks: [],
  check: (facts) => {
    return facts.blocksIndexingViaHeader
      ? issueCheck(
          "x-robots-indexing",
          "Remove blocking X-Robots-Tag directives from the final response",
          "high",
          "Remove noindex-style X-Robots-Tag directives from the final HTTP response if this page is meant to appear in search results.",
          `The final response includes X-Robots-Tag: ${facts.xRobotsTag}.`,
          "document",
          "x-robots-tag",
          { xRobotsTag: facts.xRobotsTag }
        )
      : passedCheck(
          "x-robots-indexing",
          "X-Robots-Tag does not block indexing",
          "The final HTTP response does not include an X-Robots-Tag that blocks indexing.",
          "document",
          "x-robots-tag",
          { xRobotsTag: facts.xRobotsTag }
        );
  },
});

const robotsTxtCrawlability = defineRule({
  id: "robots-txt-crawlability",
  label: "robots.txt Crawlability",
  packId: "indexability",
  priority: 8,
  relatedPacks: [],
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
  priority: 9,
  relatedPacks: [],
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

const htmlLang = defineRule({
  id: "html-lang",
  label: "HTML Language",
  packId: "crawlability",
  priority: 25,
  relatedPacks: [],
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
  priority: 11,
  relatedPacks: [],
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

const anchorTextQuality = defineRule({
  id: "anchor-text-quality",
  label: "Anchor Text Quality",
  packId: "crawlability",
  priority: 18,
  relatedPacks: [],
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
  relatedPacks: [],
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

const robotsIndexing = defineRule({
  id: "robots-indexing",
  label: "Robots Indexing",
  packId: "indexability",
  priority: 10,
  relatedPacks: [],
  check: (facts) => {
    return facts.blocksIndexing
      ? issueCheck(
          "robots-indexing",
          "Allow indexing in the HTML response before rendering",
          "high",
          "Remove noindex directives from the HTML response before rendering if this page is meant to appear in search results.",
          `Robots directives currently include: ${facts.robotsContent}.`,
          'head > meta[name="robots"]',
          null,
          { robotsContent: facts.robotsContent }
        )
      : passedCheck(
          "robots-indexing",
          "Robots directives allow indexing",
          "The source HTML before rendering does not block indexing.",
          'head > meta[name="robots"]',
          null,
          { robotsContent: facts.robotsContent }
        );
  },
});

export const crawlabilityRules = [
  canonicalUrl,
  canonicalIndexabilityConsistency,
  xRobotsIndexing,
  robotsTxtCrawlability,
  redirectChainClarity,
  htmlLang,
  sourceCrawlableLinks,
  anchorTextQuality,
  fragmentRouteHygiene,
  robotsIndexing,
];
