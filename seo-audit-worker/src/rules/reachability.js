import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const urlReachable = defineRule({
  id: "url-reachable",
  label: "URL Reachability",
  packId: "reachability",
  priority: 90,
  relatedPacks: [],
  check: (facts) =>
    facts.isReachable
      ? passedCheck(
          "url-reachable",
          "URL is reachable",
          "The page responded successfully to the audit crawl.",
          "document",
          "http-status",
          { statusCode: facts.statusCode }
        )
      : issueCheck(
          "url-reachable",
          "Restore page reachability",
          "high",
          "Return a successful response for this URL so crawlers can fetch the page reliably.",
          facts.statusCode === null
            ? "The audit could not confirm a successful HTTP response."
            : `The page responded with HTTP ${facts.statusCode}.`,
          "document",
          "http-status",
          { statusCode: facts.statusCode }
        ),
});

export const reachabilityRules = [urlReachable];
