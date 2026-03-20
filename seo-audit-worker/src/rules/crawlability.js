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
  priority: 7,
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
  htmlLang,
  sourceCrawlableLinks,
  anchorTextQuality,
  fragmentRouteHygiene,
  robotsIndexing,
];
