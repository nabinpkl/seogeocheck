import { defineRule } from "./defineRule.js";
import { issueCheck, passedCheck } from "./utils.js";

const urlReachable = defineRule({
  id: "url-reachable",
  label: "URL Reachability",
  packId: "reachability",
  priority: 90,
  relatedPacks: [],
  check: (facts) =>
    facts.isReachable && facts.isHtmlResponse
      ? passedCheck(
          "url-reachable",
          "HTML response is reachable",
          "The page returned a successful HTML response that crawlers can read before rendering.",
          "document",
          "http-status",
          { statusCode: facts.statusCode, contentType: facts.contentType }
        )
      : issueCheck(
          "url-reachable",
          "Return a reachable HTML response before rendering",
          "high",
          "Return a successful HTML response before rendering so crawlers can fetch and interpret this page reliably. Google may need rendering to see this signal later, which makes discovery or indexing less reliable than having it in source HTML.",
          facts.statusCode === null
            ? "The audit could not confirm a successful HTTP response."
            : !facts.isHtmlResponse
              ? `The page responded with HTTP ${facts.statusCode}, but the content type was ${facts.contentType ?? "unknown"}.`
              : `The page responded with HTTP ${facts.statusCode}.`,
          "document",
          "http-status",
          { statusCode: facts.statusCode, contentType: facts.contentType }
        ),
});

export const reachabilityRules = [urlReachable];
