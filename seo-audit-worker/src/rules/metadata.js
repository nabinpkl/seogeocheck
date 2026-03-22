import { defineRule } from "./defineRule.js";
import { issueCheck, notApplicableCheck, passedCheck } from "./utils.js";

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
          "No <title> element was found in source HTML.",
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
          'No <meta name="description"> tag was found in source HTML.',
          'head > meta[name="description"]',
          null,
          { length: 0 }
        );
  },
});

const socialPreviewCore = defineRule({
  id: "social-preview-core",
  label: "Open Graph Preview",
  packId: "metadata",
  priority: 3,
  problemFamily: "social_open_graph",
  relatedPacks: [],
  check: (facts) => {
    if (facts.socialMetadataControl.openGraph.status === "missing") {
      return issueCheck(
        "social-preview-core",
        "Add core Open Graph tags in source HTML",
        "medium",
        "Add the core Open Graph tags in the HTML response before rendering so shared links have reliable preview metadata without relying on JavaScript.",
        "Missing og:title, og:description, og:type, og:url, and og:image in source HTML.",
        'head > meta[property^="og:"]',
        "social-open-graph",
        facts.socialMetadataControl.openGraph
      );
    }

    if (facts.socialMetadataControl.openGraph.status === "incomplete") {
      return issueCheck(
        "social-preview-core",
        "Complete the Open Graph sharing fields in source HTML",
        "low",
        "Fill in the missing Open Graph fields in the HTML response before rendering so link previews have a more complete source of truth.",
        `Missing ${facts.socialMetadataControl.openGraph.missingFields.join(", ")} in source HTML.`,
        'head > meta[property^="og:"]',
        "social-open-graph",
        facts.socialMetadataControl.openGraph
      );
    }

    return passedCheck(
      "social-preview-core",
      "Core Open Graph metadata is present",
      "The source HTML exposes the core Open Graph fields used for link sharing.",
      'head > meta[property^="og:"]',
      "social-open-graph",
      facts.socialMetadataControl.openGraph
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
      : notApplicableCheck(
          "structured-data-presence",
          "No source structured data was detected",
          "No structured data was detected in the HTML response before rendering. This is optional for general pages and can be added later when the page qualifies for rich results.",
          'script[type="application/ld+json"], [itemscope], [typeof]',
          "structured-data-kinds",
          { structuredDataKinds: [], reasonCode: "missing_prerequisite" },
          "If this page should be eligible for rich results, add valid structured data in source HTML that matches the visible page content."
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
      return notApplicableCheck(
        "document-title-quality",
        "Title quality will be evaluated after a title is added",
        "The source HTML needs a title before title length quality can be evaluated.",
        "head > title",
        "document-title-length",
        { ...facts.titleControl, reasonCode: "missing_prerequisite", blockedBy: ["document-title"] },
        "A healthy source title exists before rendering and stays within the audit's preferred length range."
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
      return notApplicableCheck(
        "meta-description-quality",
        "Meta description quality will be evaluated after one is added",
        "The source HTML needs a meta description before length quality can be evaluated.",
        'head > meta[name="description"]',
        "meta-description-length",
        {
          ...facts.metaDescriptionControl,
          reasonCode: "missing_prerequisite",
          blockedBy: ["meta-description"],
        },
        "A healthy source meta description exists before rendering and stays within the audit's preferred length range."
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

const twitterPreviewCore = defineRule({
  id: "twitter-preview-core",
  label: "Twitter Preview",
  packId: "metadata",
  priority: 5,
  problemFamily: "social_twitter",
  relatedPacks: [],
  check: (facts) => {
    if (facts.socialMetadataControl.twitter.status === "missing") {
      return issueCheck(
        "twitter-preview-core",
        "Add core Twitter card tags in source HTML",
        "medium",
        "Add the core Twitter card tags in the HTML response before rendering so Twitter-compatible previews have reliable metadata in source HTML.",
        "Missing twitter:card, twitter:title, twitter:description, and twitter:image in source HTML.",
        'head > meta[name^="twitter:"]',
        "social-twitter",
        facts.socialMetadataControl.twitter
      );
    }

    if (facts.socialMetadataControl.twitter.status === "incomplete") {
      return issueCheck(
        "twitter-preview-core",
        "Complete the Twitter card fields in source HTML",
        "low",
        "Fill in the missing Twitter card fields in the HTML response before rendering so shared previews stay complete and predictable.",
        `Missing ${facts.socialMetadataControl.twitter.missingFields.join(", ")} in source HTML.`,
        'head > meta[name^="twitter:"]',
        "social-twitter",
        facts.socialMetadataControl.twitter
      );
    }

    return passedCheck(
      "twitter-preview-core",
      "Core Twitter card metadata is present",
      "The source HTML exposes the core Twitter card fields used for social sharing.",
      'head > meta[name^="twitter:"]',
      "social-twitter",
      facts.socialMetadataControl.twitter
    );
  },
});

const socialPreviewUrlHygiene = defineRule({
  id: "social-preview-url-hygiene",
  label: "Social Preview URL Hygiene",
  packId: "metadata",
  priority: 6,
  problemFamily: "social_url_hygiene",
  relatedPacks: [],
  check: (facts) => {
    if (facts.socialUrlControl.status === "none") {
      return notApplicableCheck(
        "social-preview-url-hygiene",
        "No social preview URLs need validation yet",
        "This check only validates social URL fields that are already present in source HTML.",
        'head > meta[property="og:url"], head > meta[property="og:image"], head > meta[name="twitter:image"]',
        "social-url-hygiene",
        { ...facts.socialUrlControl, reasonCode: "missing_prerequisite" },
        "When social preview URLs are present, they should use absolute HTTP(S) values for og:url, og:image, and twitter:image."
      );
    }

    if (facts.socialUrlControl.status === "issues") {
      return issueCheck(
        "social-preview-url-hygiene",
        "Use absolute HTTP(S) social preview URLs in source HTML",
        "low",
        "Use absolute HTTP(S) URLs for og:url, og:image, and twitter:image in source HTML so shared previews rely on explicit, crawler-readable URL values.",
        `Detected invalid social URL fields for ${facts.socialUrlControl.invalidFields.map((field) => `${field.field} (${field.status})`).join(", ")}.`,
        'head > meta[property="og:url"], head > meta[property="og:image"], head > meta[name="twitter:image"]',
        "social-url-hygiene",
        facts.socialUrlControl
      );
    }

    return passedCheck(
      "social-preview-url-hygiene",
      "Social preview URLs are explicit and usable",
      "Present social preview URL fields use absolute HTTP(S) URLs in source HTML.",
      'head > meta[property="og:url"], head > meta[property="og:image"], head > meta[name="twitter:image"]',
      "social-url-hygiene",
      facts.socialUrlControl
    );
  },
});

const robotsPreviewDirectives = defineRule({
  id: "robots-preview-directives",
  label: "Robots Preview Directives",
  packId: "metadata",
  priority: 6,
  problemFamily: "robots_preview",
  relatedPacks: [],
  check: (facts) => {
    if (facts.robotsPreviewControl.status === "conflict") {
      return issueCheck(
        "robots-preview-directives",
        "Resolve conflicting robots preview directives",
        "low",
        "Make the preview-related robots directives consistent so snippet and preview behavior stays predictable.",
        `Conflicts were detected for ${facts.robotsPreviewControl.conflicts.map((conflict) => conflict.field).join(", ")}.`,
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-preview",
        facts.robotsPreviewControl
      );
    }

    if (facts.robotsPreviewControl.status === "restrictive") {
      return issueCheck(
        "robots-preview-directives",
        "Relax restrictive preview directives if richer snippets are desired",
        "low",
        "Remove restrictive preview directives in source HTML or headers if this page should be eligible for richer snippet and preview treatment.",
        `Detected restrictive preview directives: ${facts.robotsPreviewControl.restrictiveSignals.join(", ")}.`,
        'head > meta[name="robots"], head > meta[name="googlebot"], document',
        "robots-preview",
        facts.robotsPreviewControl
      );
    }

    return passedCheck(
      "robots-preview-directives",
      "Preview directives are not restrictive",
      "The effective robots preview directives do not restrict snippet or image/video preview behavior in this pass.",
      'head > meta[name="robots"], head > meta[name="googlebot"], document',
      "robots-preview",
      facts.robotsPreviewControl
    );
  },
});

const coreMetadataAlignment = defineRule({
  id: "core-metadata-alignment",
  label: "Core Metadata Alignment",
  packId: "metadata",
  priority: 7,
  problemFamily: "metadata_alignment",
  relatedPacks: [],
  check: (facts) => {
    if (facts.metadataAlignmentControl.status === "not_applicable") {
      return notApplicableCheck(
        "core-metadata-alignment",
        "Core metadata alignment will be evaluated after title and H1 are available",
        "This check needs both a source title and a source H1 before alignment can be evaluated.",
        "head > title, body h1, head > meta[name=\"description\"]",
        "metadata-alignment",
        {
          ...facts.metadataAlignmentControl,
          reasonCode: "missing_prerequisite",
          blockedBy: ["document-title", "primary-heading"],
        },
        "A healthy metadata set keeps the source title, first H1, and meta description focused on the same primary topic."
      );
    }

    if (facts.metadataAlignmentControl.status !== "aligned") {
      const detailParts = [];
      if (facts.metadataAlignmentControl.titleH1Mismatch) {
        detailParts.push("The source title and first source H1 do not share meaningful topic terms.");
      }
      if (facts.metadataAlignmentControl.weakMetaDescriptionAlignment) {
        detailParts.push("The source meta description overlaps weakly with the title/H1 topic terms.");
      }

      return issueCheck(
        "core-metadata-alignment",
        "Align the source title, H1, and meta description more closely",
        facts.metadataAlignmentControl.titleH1Mismatch ? "medium" : "low",
        "Keep the source title, first H1, and meta description focused on the same primary topic so crawlers receive one coherent page summary.",
        detailParts.join(" "),
        "head > title, body h1, head > meta[name=\"description\"]",
        "metadata-alignment",
        facts.metadataAlignmentControl
      );
    }

    return passedCheck(
      "core-metadata-alignment",
      "Core metadata is topically aligned",
      "The source title, first H1, and meta description appear to reinforce the same topic.",
      "head > title, body h1, head > meta[name=\"description\"]",
      "metadata-alignment",
      facts.metadataAlignmentControl
    );
  },
});

const metaViewport = defineRule({
  id: "meta-viewport",
  label: "Meta Viewport",
  packId: "metadata",
  priority: 7,
  problemFamily: "meta_viewport",
  relatedPacks: [],
  check: (facts) => {
    if (facts.viewportControl.status === "missing") {
      return issueCheck(
        "meta-viewport",
        "Add a viewport meta tag in source HTML",
        "medium",
        "Add a mobile-friendly viewport meta tag in the HTML response before rendering so the page declares responsive intent in source HTML.",
        'No <meta name="viewport"> tag was found in source HTML.',
        'head > meta[name="viewport"]',
        "meta-viewport",
        facts.viewportControl
      );
    }

    if (facts.viewportControl.status === "invalid_or_unfriendly") {
      return issueCheck(
        "meta-viewport",
        "Use a mobile-friendly viewport configuration",
        "low",
        "Update the viewport meta tag so it supports mobile-friendly rendering without disabling zoom or omitting width=device-width.",
        `Current viewport content: "${facts.viewportControl.content}".`,
        'head > meta[name="viewport"]',
        "meta-viewport",
        facts.viewportControl
      );
    }

    return passedCheck(
      "meta-viewport",
      "Viewport meta tag is mobile-friendly",
      "The source HTML declares a mobile-friendly viewport configuration.",
      'head > meta[name="viewport"]',
      "meta-viewport",
      facts.viewportControl
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
      return notApplicableCheck(
        "structured-data-validity",
        "No JSON-LD blocks need validation",
        "The source HTML did not expose JSON-LD blocks to validate in this pass.",
        'script[type="application/ld+json"]',
        "structured-data-validity",
        { ...facts.structuredDataControl, reasonCode: "missing_prerequisite" },
        "If this page is intended for rich results, a healthy setup includes parseable JSON-LD blocks with @context and @type in source HTML."
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

const faviconPresence = defineRule({
  id: "favicon-presence",
  label: "Favicon Presence",
  packId: "metadata",
  priority: 10,
  problemFamily: "favicon",
  relatedPacks: [],
  check: (facts) => {
    if (facts.faviconControl.status === "missing") {
      return issueCheck(
        "favicon-presence",
        "Add a favicon or app icon in source HTML",
        "low",
        "Add a favicon or app icon link in the HTML response before rendering so the page has a basic browser and sharing presentation asset.",
        "No favicon or apple-touch icon link was found in source HTML.",
        'head > link[rel~="icon"], head > link[rel="apple-touch-icon"]',
        "favicon",
        facts.faviconControl
      );
    }

    return passedCheck(
      "favicon-presence",
      "A favicon or app icon is declared",
      "The source HTML declares at least one favicon or app icon link.",
      'head > link[rel~="icon"], head > link[rel="apple-touch-icon"]',
      "favicon",
      facts.faviconControl
    );
  },
});

const headDuplicateHygiene = defineRule({
  id: "head-duplicate-hygiene",
  label: "Head Duplicate Hygiene",
  packId: "metadata",
  priority: 11,
  problemFamily: "head_hygiene",
  relatedPacks: [],
  check: (facts) => {
    if (facts.headHygieneControl.status === "duplicates_present") {
      return issueCheck(
        "head-duplicate-hygiene",
        "Remove duplicate head metadata in source HTML",
        "low",
        "Reduce duplicate title, meta, or social tags in the HTML response before rendering so crawlers receive one clear signal per field.",
        `Detected duplicates for ${facts.headHygieneControl.problematicFields.map((field) => `${field.field} (${field.count})`).join(", ")}.`,
        "head",
        "head-duplicates",
        facts.headHygieneControl
      );
    }

    return passedCheck(
      "head-duplicate-hygiene",
      "Head metadata does not contain harmful duplicates",
      "The source head did not expose duplicate title, meta description, viewport, or social tags that this audit tracks.",
      "head",
      "head-duplicates",
      facts.headHygieneControl
    );
  },
});

export const metadataRules = [
  documentTitle,
  metaDescription,
  documentTitleQuality,
  socialPreviewCore,
  metaDescriptionQuality,
  twitterPreviewCore,
  socialPreviewUrlHygiene,
  robotsPreviewDirectives,
  coreMetadataAlignment,
  metaViewport,
  structuredDataPresence,
  structuredDataValidity,
  faviconPresence,
  headDuplicateHygiene,
];
