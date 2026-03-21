import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const primaryHeading = defineRule({
  id: "primary-heading",
  label: "Primary Heading",
  packId: "contentVisibility",
  priority: 2,
  problemFamily: "heading_structure",
  relatedPacks: [],
  check: (facts) => {
    return facts.hasPrimaryHeading
      ? passedCheck(
          "primary-heading",
          "Primary heading is present",
          "The source HTML before rendering includes a primary heading.",
          "body h1",
          null,
          { h1Count: facts.h1Count }
        )
      : issueCheck(
          "primary-heading",
          "Add a primary heading in the HTML response before rendering",
          "medium",
          "Add a descriptive <h1> in the HTML response before rendering so the page topic is clear without relying on rendered JavaScript.",
          "No <h1> was found in source HTML.",
          "body h1",
          null,
          { h1Count: facts.h1Count }
        );
  },
});

const sourceVisibleText = defineRule({
  id: "source-visible-text",
  label: "Source Visible Text",
  packId: "contentVisibility",
  priority: 1,
  relatedPacks: [],
  check: (facts) => {
    return facts.sourceWordCount >= 20
      ? passedCheck(
          "source-visible-text",
          "Source HTML includes visible text",
          "The HTML response before rendering already includes visible body text.",
          "body",
          "source-word-count",
          { wordCount: facts.sourceWordCount }
        )
      : issueCheck(
          "source-visible-text",
          "Add visible body text in the HTML response before rendering",
          "high",
          "Include meaningful body text in the HTML response before rendering. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
          `Detected roughly ${facts.sourceWordCount} words of source body content.`,
          "body",
          "source-word-count",
          { wordCount: facts.sourceWordCount }
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
          "The source HTML before rendering includes enough body copy to explain the topic.",
          "body",
          "word-count",
          { wordCount: facts.wordCount }
        )
      : issueCheck(
          "content-depth",
          "Add more explanatory copy in the HTML response before rendering",
          "medium",
          "Expand the source HTML before rendering with more useful body copy so the topic and intent are clearer without relying on rendered JavaScript.",
          `Detected roughly ${facts.wordCount} words of body content.`,
          "body",
          "word-count",
          { wordCount: facts.wordCount }
        );
  },
});

const headingStructure = defineRule({
  id: "heading-structure",
  label: "Heading Structure",
  packId: "contentVisibility",
  priority: 3,
  problemFamily: "heading_structure",
  relatedPacks: [],
  check: (facts) => {
    if (facts.headingControl.status === "missing") {
      return passedCheck(
        "heading-structure",
        "Heading structure will be evaluated after a primary heading is added",
        "The source HTML needs a primary heading before H1 structure can be evaluated.",
        "body h1",
        "h1-count",
        facts.headingControl
      );
    }

    if (facts.headingControl.status === "multiple") {
      return issueCheck(
        "heading-structure",
        "Reduce multiple H1 elements in source HTML",
        "low",
        "Prefer one primary H1 in the source HTML so the main topic stays unambiguous before rendering.",
        `Detected ${facts.headingControl.h1Count} H1 elements in source HTML.`,
        "body h1",
        "h1-count",
        facts.headingControl
      );
    }

    return passedCheck(
      "heading-structure",
      "Heading structure uses a single H1",
      "The source HTML exposes one primary H1.",
      "body h1",
      "h1-count",
      facts.headingControl
    );
  },
});

const linkedImageAlt = defineRule({
  id: "linked-image-alt",
  label: "Linked Image Alt",
  packId: "contentVisibility",
  priority: 6,
  relatedPacks: [],
  check: (facts) => {
    return facts.linkedImageMissingAltCount === 0
      ? passedCheck(
          "linked-image-alt",
          "Linked images include alt text",
          "Linked images in the source HTML before rendering include alt text.",
          "a img",
          "linked-images-missing-alt",
          {
            linkedImageCount: facts.linkedImageCount,
            linkedImageMissingAltCount: facts.linkedImageMissingAltCount,
          }
        )
      : issueCheck(
          "linked-image-alt",
          "Add alt text to linked images in the HTML response before rendering",
          "medium",
          "Add descriptive alt text to linked images in the HTML response before rendering so linked media still communicates destination context without relying on rendered JavaScript.",
          `Detected ${facts.linkedImageMissingAltCount} linked image${facts.linkedImageMissingAltCount === 1 ? "" : "s"} without alt text.`,
          "a img",
          "linked-images-missing-alt",
          {
            linkedImageCount: facts.linkedImageCount,
            linkedImageMissingAltCount: facts.linkedImageMissingAltCount,
          }
        );
  },
});

export const contentRules = [
  primaryHeading,
  sourceVisibleText,
  headingStructure,
  contentDepth,
  linkedImageAlt,
];
