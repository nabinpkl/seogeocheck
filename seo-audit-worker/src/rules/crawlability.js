import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const canonicalUrl = defineRule({
  id: "canonical-url",
  label: "Canonical URL",
  packId: "indexability",
  priority: 5,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasCanonicalUrl
      ? passedCheck(
          "canonical-url",
          "Canonical URL is present",
          "The page declares a canonical URL.",
          'head > link[rel="canonical"]',
          null,
          { canonicalUrl: facts.canonicalUrl }
        )
      : issueCheck(
          "canonical-url",
          "Add a canonical URL",
          "medium",
          "Add a canonical link element so search engines understand the preferred version of this page.",
          null,
          'head > link[rel="canonical"]',
          null,
          { canonicalUrl: null }
        );
  },
});

const htmlLang = defineRule({
  id: "html-lang",
  label: "HTML Language",
  packId: "crawlability",
  priority: 6,
  relatedPacks: [],
  check: (facts) => {
    return facts.lang
      ? passedCheck(
          "html-lang",
          "HTML language is declared",
          "The page declares its document language.",
          "html",
          null,
          { lang: facts.lang }
        )
      : issueCheck(
          "html-lang",
          "Declare the page language",
          "low",
          "Add a lang attribute on the <html> element to clarify language targeting.",
          null,
          "html",
          null,
          { lang: null }
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
          "Allow indexing for this page",
          "high",
          "Remove noindex directives if this page is meant to appear in search results.",
          `Robots directives currently include: ${facts.robotsContent}.`,
          'head > meta[name="robots"]',
          null,
          { robotsContent: facts.robotsContent }
        )
      : passedCheck(
          "robots-indexing",
          "Robots directives allow indexing",
          "The current robots directives do not block indexing.",
          'head > meta[name="robots"]',
          null,
          { robotsContent: facts.robotsContent }
        );
  },
});

export const crawlabilityRules = [canonicalUrl, htmlLang, robotsIndexing];
