import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const primaryHeading = defineRule({
  id: "primary-heading",
  label: "Primary Heading",
  packId: "contentVisibility",
  priority: 2,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasSingleH1
      ? passedCheck(
          "primary-heading",
          "Primary heading is well formed",
          "The page uses a single primary heading.",
          "body h1",
          null,
          { h1Count: facts.h1Count }
        )
      : issueCheck(
          "primary-heading",
          "Strengthen the primary heading",
          "medium",
          "Use exactly one descriptive <h1> that matches the page's primary search intent.",
          facts.h1Count === 0 ? "No <h1> was found on the page." : `Found ${facts.h1Count} <h1> elements.`,
          "body h1",
          null,
          { h1Count: facts.h1Count }
        );
  },
});

const contentDepth = defineRule({
  id: "content-depth",
  label: "Content Depth",
  packId: "contentVisibility",
  priority: 4,
  relatedPacks: [],
  check: (facts) => {
    return facts.wordCount >= 100
      ? passedCheck(
          "content-depth",
          "Content depth is sufficient",
          "The page includes enough body copy to explain its topic to users and search engines.",
          "body",
          "word-count",
          { wordCount: facts.wordCount }
        )
      : issueCheck(
          "content-depth",
          "Add more explanatory copy",
          "medium",
          "Expand the page with more useful body copy so the topic and intent are clearer.",
          `Detected roughly ${facts.wordCount} words of body content.`,
          "body",
          "word-count",
          { wordCount: facts.wordCount }
        );
  },
});

export const contentRules = [primaryHeading, contentDepth];
