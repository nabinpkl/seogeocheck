import { reachabilityRules } from "./reachability.js";
import { crawlabilityRules } from "./crawlability.js";
import { contentRules } from "./content.js";
import { metadataRules } from "./metadata.js";

const REGISTERED_RULES = [
  ...reachabilityRules,
  ...crawlabilityRules,
  ...contentRules,
  ...metadataRules,
].map((rule) => ({
  ...rule,
  relatedPacks: rule.relatedPacks ?? [],
}));

const PACK_DEFINITIONS = [
  { id: "reachability", label: "Reachability", weight: 1 },
  { id: "crawlability", label: "Crawlability", weight: 1 },
  { id: "indexability", label: "Indexability", weight: 1 },
  { id: "contentVisibility", label: "Content Visibility", weight: 1 },
  { id: "metadata", label: "Metadata", weight: 1 },
  { id: "discovery", label: "Discovery", weight: 1 },
];

export const PACKS = PACK_DEFINITIONS.map((pack) => ({
  ...pack,
  rules: REGISTERED_RULES.filter((rule) => rule.packId === pack.id),
}));

export const ACTIVE_PACKS = PACKS.filter((pack) => pack.rules.length > 0);

export const ALL_RULES = [...REGISTERED_RULES];

export const SORTED_RULES = [...ALL_RULES].sort((left, right) => left.priority - right.priority);
