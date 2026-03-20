import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const documentTitle = defineRule({
  id: "document-title",
  label: "Document Title",
  packId: "metadata",
  priority: 0,
  relatedPacks: [],
  check: (facts) => {
    if (!facts.hasTitle) {
      return issueCheck(
          "document-title",
          "Add a unique page title in the HTML response before rendering",
          "high",
          "Add a unique <title> in the HTML response before rendering so search engines can understand the page without relying on rendered JavaScript.",
          null,
          "head > title",
          null,
          { length: 0 }
        );
    }

    return facts.hasPlaceholderTitle
      ? issueCheck(
          "document-title",
          "Replace the placeholder title in the HTML response before rendering",
          "low",
          "Replace generic placeholder title text in the HTML response before rendering with something specific to this page.",
          `The current source title is "${facts.title}".`,
          "head > title",
          null,
          { length: facts.titleLength, title: facts.title }
        )
      : passedCheck(
          "document-title",
          "Page title is present",
          "The HTML response before rendering includes a descriptive title element.",
          "head > title",
          null,
          { length: facts.titleLength }
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
          "The HTML response before rendering includes a summary snippet for this page.",
          'head > meta[name="description"]',
          null,
          { length: facts.metaDescriptionLength }
        )
      : issueCheck(
          "meta-description",
          "Add a meta description in the HTML response before rendering",
          "medium",
          "Add a concise meta description in the HTML response before rendering so search engines can read a summary snippet without relying on rendered JavaScript.",
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
          "The source HTML before rendering exposes at least one Open Graph field for richer link previews.",
          'head > meta[property^="og:"]',
          null,
          {
            openGraphTitlePresent: Boolean(facts.openGraphTitle),
            openGraphDescriptionPresent: Boolean(facts.openGraphDescription),
          }
        )
      : issueCheck(
          "social-preview",
          "Add Open Graph preview metadata in the HTML response before rendering",
          "medium",
          "Add Open Graph title or description tags in the HTML response before rendering so shared links render with clearer context without relying on JavaScript.",
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

const structuredDataPresence = defineRule({
  id: "structured-data-presence",
  label: "Structured Data Presence",
  packId: "metadata",
  priority: 8,
  relatedPacks: [],
  check: (facts) => {
    return facts.hasStructuredDataInSource
      ? passedCheck(
          "structured-data-presence",
          "Structured data is present in source HTML",
          "The HTML response before rendering includes structured data markup.",
          'script[type="application/ld+json"], [itemscope], [typeof]',
          "structured-data-kinds",
          { structuredDataKinds: facts.structuredDataKinds }
        )
      : passedCheck(
          "structured-data-presence",
          "No source structured data was detected",
          "No structured data was detected in the HTML response before rendering. This is optional for general pages and can be added later when the page qualifies for rich results.",
          'script[type="application/ld+json"], [itemscope], [typeof]',
          "structured-data-kinds",
          { structuredDataKinds: [] }
        );
  },
});

export const metadataRules = [documentTitle, metaDescription, socialPreview, structuredDataPresence];
