import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const documentTitle = defineRule({
  id: "document-title",
  label: "Document Title",
  packId: "metadata",
  priority: 0,
  problemFamily: "document_title",
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
  problemFamily: "meta_description",
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
  problemFamily: "structured_data",
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

const documentTitleQuality = defineRule({
  id: "document-title-quality",
  label: "Document Title Quality",
  packId: "metadata",
  priority: 2,
  problemFamily: "document_title",
  relatedPacks: [],
  check: (facts) => {
    if (!facts.hasTitle) {
      return passedCheck(
        "document-title-quality",
        "Title quality will be evaluated after a title is added",
        "The source HTML needs a title before title length quality can be evaluated.",
        "head > title",
        "document-title-length",
        facts.titleControl
      );
    }

    if (facts.titleControl.status === "too_short") {
      return issueCheck(
        "document-title-quality",
        "Expand the source title so it is more descriptive",
        "low",
        "Lengthen the source title so it communicates the page topic more clearly before rendering.",
        `The current source title is ${facts.titleControl.length} characters long.`,
        "head > title",
        "document-title-length",
        facts.titleControl
      );
    }

    if (facts.titleControl.status === "too_long") {
      return issueCheck(
        "document-title-quality",
        "Tighten the source title length",
        "low",
        "Shorten the source title so it stays concise and easier for search results to present consistently.",
        `The current source title is ${facts.titleControl.length} characters long.`,
        "head > title",
        "document-title-length",
        facts.titleControl
      );
    }

    return passedCheck(
      "document-title-quality",
      "Title length is in a healthy range",
      "The source title length is within the preferred range for this audit.",
      "head > title",
      "document-title-length",
      facts.titleControl
    );
  },
});

const metaDescriptionQuality = defineRule({
  id: "meta-description-quality",
  label: "Meta Description Quality",
  packId: "metadata",
  priority: 4,
  problemFamily: "meta_description",
  relatedPacks: [],
  check: (facts) => {
    if (!facts.hasMetaDescription) {
      return passedCheck(
        "meta-description-quality",
        "Meta description quality will be evaluated after one is added",
        "The source HTML needs a meta description before length quality can be evaluated.",
        'head > meta[name="description"]',
        "meta-description-length",
        facts.metaDescriptionControl
      );
    }

    if (facts.metaDescriptionControl.status === "too_short") {
      return issueCheck(
        "meta-description-quality",
        "Expand the source meta description",
        "low",
        "Lengthen the source meta description so it summarizes the page more clearly before rendering.",
        `The current source meta description is ${facts.metaDescriptionControl.length} characters long.`,
        'head > meta[name="description"]',
        "meta-description-length",
        facts.metaDescriptionControl
      );
    }

    if (facts.metaDescriptionControl.status === "too_long") {
      return issueCheck(
        "meta-description-quality",
        "Tighten the source meta description length",
        "low",
        "Shorten the source meta description so it stays concise and easier for search results to present consistently.",
        `The current source meta description is ${facts.metaDescriptionControl.length} characters long.`,
        'head > meta[name="description"]',
        "meta-description-length",
        facts.metaDescriptionControl
      );
    }

    return passedCheck(
      "meta-description-quality",
      "Meta description length is in a healthy range",
      "The source meta description length is within the preferred range for this audit.",
      'head > meta[name="description"]',
      "meta-description-length",
      facts.metaDescriptionControl
    );
  },
});

const structuredDataValidity = defineRule({
  id: "structured-data-validity",
  label: "Structured Data Validity",
  packId: "metadata",
  priority: 9,
  problemFamily: "structured_data",
  relatedPacks: [],
  check: (facts) => {
    if (facts.structuredDataControl.status === "none") {
      return passedCheck(
        "structured-data-validity",
        "No JSON-LD blocks need validation",
        "The source HTML did not expose JSON-LD blocks to validate in this pass.",
        'script[type="application/ld+json"]',
        "structured-data-validity",
        facts.structuredDataControl
      );
    }

    if (facts.structuredDataControl.status === "invalid") {
      return issueCheck(
        "structured-data-validity",
        "Fix invalid JSON-LD blocks in source HTML",
        "medium",
        "Repair malformed JSON-LD blocks in the source HTML so search engines can parse the markup reliably without relying on rendering.",
        `Detected ${facts.structuredDataControl.invalidJsonLdBlocks} invalid JSON-LD block${facts.structuredDataControl.invalidJsonLdBlocks === 1 ? "" : "s"}.`,
        'script[type="application/ld+json"]',
        "structured-data-validity",
        facts.structuredDataControl
      );
    }

    if (facts.structuredDataControl.status === "empty") {
      return issueCheck(
        "structured-data-validity",
        "Remove empty JSON-LD blocks from source HTML",
        "medium",
        "Remove empty JSON-LD blocks or replace them with valid structured data so the source markup stays intentional and parseable.",
        `Detected ${facts.structuredDataControl.emptyJsonLdBlocks} empty JSON-LD block${facts.structuredDataControl.emptyJsonLdBlocks === 1 ? "" : "s"}.`,
        'script[type="application/ld+json"]',
        "structured-data-validity",
        facts.structuredDataControl
      );
    }

    if (facts.structuredDataControl.status === "incomplete") {
      return issueCheck(
        "structured-data-validity",
        "Complete the JSON-LD basics in source HTML",
        "low",
        "Add the missing JSON-LD basics such as @context and @type so the source structured data is easier for search engines to interpret.",
        `Detected ${facts.structuredDataControl.missingContextBlocks} block${facts.structuredDataControl.missingContextBlocks === 1 ? "" : "s"} missing @context and ${facts.structuredDataControl.missingTypeBlocks} block${facts.structuredDataControl.missingTypeBlocks === 1 ? "" : "s"} missing @type.`,
        'script[type="application/ld+json"]',
        "structured-data-validity",
        facts.structuredDataControl
      );
    }

    return passedCheck(
      "structured-data-validity",
      "JSON-LD blocks are parseable",
      "The source HTML JSON-LD blocks were parseable and included the basic fields checked in this pass.",
      'script[type="application/ld+json"]',
      "structured-data-validity",
      facts.structuredDataControl
    );
  },
});

export const metadataRules = [
  documentTitle,
  metaDescription,
  documentTitleQuality,
  socialPreview,
  metaDescriptionQuality,
  structuredDataPresence,
  structuredDataValidity,
];
