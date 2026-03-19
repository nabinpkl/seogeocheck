import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const documentTitle = defineRule({
  id: "document-title",
  label: "Document Title",
  packId: "metadata",
  priority: 0,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasTitle
      ? passedCheck(
          "document-title",
          "Page title is present",
          "The page already includes a title element that search engines can read.",
          "head > title",
          null,
          { length: facts.titleLength }
        )
      : issueCheck(
          "document-title",
          "Add a unique page title",
          "high",
          "Add a unique <title> that clearly names the page and its primary search intent.",
          null,
          "head > title",
          null,
          { length: 0 }
        );
  },
});

const metaDescription = defineRule({
  id: "meta-description",
  label: "Meta Description",
  packId: "metadata",
  priority: 1,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasMetaDescription
      ? passedCheck(
          "meta-description",
          "Meta description is present",
          "Search engines can already read a summary snippet for this page.",
          'head > meta[name="description"]',
          null,
          { length: facts.metaDescriptionLength }
        )
      : issueCheck(
          "meta-description",
          "Add a meta description",
          "high",
          "Add a concise meta description that summarizes the page and encourages the right click-through.",
          null,
          'head > meta[name="description"]',
          null,
          { length: 0 }
        );
  },
});

const socialPreview = defineRule({
  id: "social-preview",
  label: "Social Preview",
  packId: "metadata",
  priority: 3,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasSocialPreview
      ? passedCheck(
          "social-preview",
          "Social preview metadata is present",
          "The page exposes at least one Open Graph field for richer link previews.",
          'head > meta[property^="og:"]',
          null,
          {
            openGraphTitlePresent: Boolean(facts.openGraphTitle),
            openGraphDescriptionPresent: Boolean(facts.openGraphDescription),
          }
        )
      : issueCheck(
          "social-preview",
          "Add Open Graph preview metadata",
          "medium",
          "Add Open Graph title or description tags so shared links render with clearer context.",
          null,
          'head > meta[property^="og:"]',
          null,
          {
            openGraphTitlePresent: false,
            openGraphDescriptionPresent: false,
          }
        );
  },
});

export const metadataRules = [documentTitle, metaDescription, socialPreview];
