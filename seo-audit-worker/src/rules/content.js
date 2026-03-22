import { defineRule } from "./defineRule.js";
import { issueCheck, notApplicableCheck, passedCheck } from "./utils.js";

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
      return notApplicableCheck(
        "heading-structure",
        "Heading structure will be evaluated after a primary heading is added",
        "The source HTML needs a primary heading before heading hierarchy quality can be evaluated.",
        "body h1",
        "h1-count",
        {
          ...facts.headingControl,
          reasonCode: "missing_prerequisite",
          blockedBy: ["primary-heading"],
        },
        "A healthy heading structure starts with one primary H1 and avoids skipping heading levels in source HTML."
      );
    }

    if (facts.headingControl.hasMultipleH1 || facts.headingControl.hasSkippedLevels) {
      const detailParts = [];
      if (facts.headingControl.hasMultipleH1) {
        detailParts.push(`Detected ${facts.headingControl.h1Count} H1 elements in source HTML.`);
      }
      if (facts.headingControl.hasSkippedLevels) {
        detailParts.push(
          `Detected ${facts.headingControl.skippedTransitions.length} heading level jump${facts.headingControl.skippedTransitions.length === 1 ? "" : "s"} that skip intermediate levels.`
        );
      }

      return issueCheck(
        "heading-structure",
        "Tighten the heading hierarchy in source HTML",
        "low",
        "Use one primary H1 and avoid jumping over heading levels in the source HTML so the content outline stays clear before rendering.",
        detailParts.join(" "),
        "body h1",
        "h1-count",
        facts.headingControl
      );
    }

    return passedCheck(
      "heading-structure",
      "Heading structure is orderly",
      "The source HTML exposes one primary H1 without skipped heading levels.",
      "body h1",
      "h1-count",
      facts.headingControl
    );
  },
});

const bodyImageAlt = defineRule({
  id: "body-image-alt",
  label: "Body Image Alt",
  packId: "contentVisibility",
  priority: 6,
  relatedPacks: [],
  check: (facts) => {
    return facts.bodyImageAltControl.status !== "missing_alt"
      ? passedCheck(
          "body-image-alt",
          "Eligible body images include alt text",
          "Eligible body images in the source HTML before rendering include alt text.",
          "body img",
          "body-images-missing-alt",
          {
            bodyImageCount: facts.bodyImageCount,
            eligibleBodyImageCount: facts.eligibleBodyImageCount,
            bodyImageMissingAltCount: facts.bodyImageMissingAltCount,
            linkedImageCount: facts.linkedImageCount,
            linkedImageMissingAltCount: facts.linkedImageMissingAltCount,
          }
        )
      : issueCheck(
          "body-image-alt",
          "Add alt text to meaningful body images in source HTML",
          "medium",
          "Add descriptive alt text to meaningful body images in the HTML response before rendering so image content is understandable without relying on rendered JavaScript.",
          `Detected ${facts.bodyImageMissingAltCount} eligible body image${facts.bodyImageMissingAltCount === 1 ? "" : "s"} without alt text.`,
          "body img",
          "body-images-missing-alt",
          {
            bodyImageCount: facts.bodyImageCount,
            eligibleBodyImageCount: facts.eligibleBodyImageCount,
            bodyImageMissingAltCount: facts.bodyImageMissingAltCount,
            linkedImageCount: facts.linkedImageCount,
            linkedImageMissingAltCount: facts.linkedImageMissingAltCount,
          }
        );
  },
});

const headingOutlineQuality = defineRule({
  id: "heading-outline-quality",
  label: "Heading Outline Quality",
  packId: "contentVisibility",
  priority: 5,
  problemFamily: "heading_structure",
  relatedPacks: [],
  check: (facts) => {
    if (facts.headingQualityControl.status === "not_applicable") {
      return notApplicableCheck(
        "heading-outline-quality",
        "Heading outline quality will be evaluated after headings are added",
        "The source HTML needs headings before outline quality can be evaluated.",
        "body h1, body h2, body h3, body h4, body h5, body h6",
        "heading-outline-quality",
        {
          ...facts.headingQualityControl,
          reasonCode: "missing_prerequisite",
          blockedBy: ["primary-heading"],
        },
        "A healthy heading outline starts with an H1, uses non-empty headings, and avoids repeated labels in source HTML."
      );
    }

    if (facts.headingQualityControl.status === "issues") {
      const detailParts = [];
      if (facts.headingQualityControl.firstHeadingNotH1) {
        detailParts.push("The first heading in source HTML is not an H1.");
      }
      if (facts.headingQualityControl.emptyHeadingCount > 0) {
        detailParts.push(
          `Detected ${facts.headingQualityControl.emptyHeadingCount} empty heading${facts.headingQualityControl.emptyHeadingCount === 1 ? "" : "s"}.`
        );
      }
      if (facts.headingQualityControl.repeatedHeadingCount > 0) {
        detailParts.push(
          `Detected ${facts.headingQualityControl.repeatedHeadingCount} repeated heading text pattern${facts.headingQualityControl.repeatedHeadingCount === 1 ? "" : "s"}.`
        );
      }

      return issueCheck(
        "heading-outline-quality",
        "Clean up heading outline quality in source HTML",
        "low",
        "Keep headings non-empty, avoid repeating the same heading text unnecessarily, and start the outline with an H1 in source HTML.",
        detailParts.join(" "),
        "body h1, body h2, body h3, body h4, body h5, body h6",
        "heading-outline-quality",
        facts.headingQualityControl
      );
    }

    return passedCheck(
      "heading-outline-quality",
      "Heading outline quality is clean",
      "The source HTML heading outline starts correctly, uses non-empty text, and avoids repeated heading labels.",
      "body h1, body h2, body h3, body h4, body h5, body h6",
      "heading-outline-quality",
      facts.headingQualityControl
    );
  },
});

export const contentRules = [
  primaryHeading,
  sourceVisibleText,
  headingStructure,
  contentDepth,
  headingOutlineQuality,
  bodyImageAlt,
];
