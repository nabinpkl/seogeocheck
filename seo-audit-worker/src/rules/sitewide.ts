import { defineRule } from "./defineRule.js";
import { issueCheck, notApplicableCheck, passedCheck, systemErrorCheck } from "./utils.js";

type MetadataExtraValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sitewideMetadata(sitewide, extra: Record<string, MetadataExtraValue> = {}) {
  return {
    targetUrl: sitewide.siteRootUrl ?? null,
    finalUrl: sitewide.preferredOrigin ?? null,
    fieldCount: Array.isArray(sitewide.sampledUrls) ? sitewide.sampledUrls.length : 0,
    ...extra,
  };
}

const siteHostCanonicalization = defineRule({
  id: "site-host-canonicalization",
  label: "Site Host Canonicalization",
  packId: "sitewide",
  scoreWeight: 4,
  priority: 12,
  problemFamily: "sitewide_foundations",
  check: (sitewide) => {
    const unavailableVariants = sitewide.hostVariants.filter(
      (variant) => variant.status === "unavailable" || variant.statusCode === null
    );

    if (unavailableVariants.length > 0) {
      return systemErrorCheck(
        "site-host-canonicalization",
        "Couldn't verify site host canonicalization fully",
        `The audit could not confirm redirect behavior for ${unavailableVariants.length} tested host or scheme variant${unavailableVariants.length === 1 ? "" : "s"}.`,
        "document",
        "site-host-canonicalization",
        sitewideMetadata(sitewide, {
          status: "unavailable",
          retryable: true,
          reasonCode: unavailableVariants.some((variant) =>
            String(variant.error ?? "").toLowerCase().includes("timeout")
          )
            ? "timeout"
            : "upstream_fetch_failed",
        }),
        "Retry this audit to re-check host and scheme convergence."
      );
    }

    const uniqueFinalOrigins = [...new Set(sitewide.hostVariants.map((variant) => variant.finalOrigin).filter(Boolean))];
    if (uniqueFinalOrigins.length > 1) {
      return issueCheck(
        "site-host-canonicalization",
        "Host and scheme variants do not converge to one preferred origin",
        "high",
        "Redirect all tested host and scheme variants to one preferred HTTPS origin.",
        `Tested variants resolved to ${uniqueFinalOrigins.length} different final origins.`,
        "document",
        "site-host-canonicalization",
        sitewideMetadata(sitewide, {
          status: "split_origin",
          fieldCount: uniqueFinalOrigins.length,
        })
      );
    }

    if (sitewide.preferredOrigin && !sitewide.preferredOrigin.startsWith("https://")) {
      return issueCheck(
        "site-host-canonicalization",
        "Preferred origin is not HTTPS",
        "high",
        "Make the preferred site origin HTTPS and redirect HTTP variants to it.",
        `The preferred final origin is ${sitewide.preferredOrigin}.`,
        "document",
        "site-host-canonicalization",
        sitewideMetadata(sitewide, {
          status: "non_https_preference",
        })
      );
    }

    const longRedirectVariant = sitewide.hostVariants.find((variant) => variant.redirectCount > 1);
    if (longRedirectVariant) {
      return issueCheck(
        "site-host-canonicalization",
        "Host canonicalization takes too many redirects",
        "medium",
        "Reduce host and scheme canonicalization to a single redirect hop where possible.",
        `The variant ${longRedirectVariant.requestedUrl} took ${longRedirectVariant.redirectCount} redirects before reaching the final origin.`,
        "document",
        "site-host-canonicalization",
        sitewideMetadata(sitewide, {
          status: "long_redirect_chain",
          redirectCount: longRedirectVariant.redirectCount,
        })
      );
    }

    return passedCheck(
      "site-host-canonicalization",
      "Host and scheme variants converge cleanly",
      "The tested host and scheme variants converge to one preferred HTTPS origin without long redirect chains.",
      "document",
      "site-host-canonicalization",
      sitewideMetadata(sitewide, {
        status: "clean",
      })
    );
  },
});

const siteRobotsTxtAvailability = defineRule({
  id: "site-robots-txt-availability",
  label: "Site robots.txt Availability",
  packId: "sitewide",
  scoreWeight: 3,
  priority: 13,
  problemFamily: "sitewide_foundations",
  check: (sitewide) => {
    const fetchFailure =
      sitewide.robotsTxt.status === "unavailable" &&
      (sitewide.robotsTxt.fetchStatusCode === null || Boolean(sitewide.robotsTxt.error));

    if (fetchFailure) {
      return systemErrorCheck(
        "site-robots-txt-availability",
        "Couldn't verify robots.txt availability",
        sitewide.robotsTxt.error
          ? `robots.txt verification failed: ${sitewide.robotsTxt.error}`
          : "The audit could not confirm the root robots.txt response.",
        "robots.txt",
        "site-robots-txt-availability",
        sitewideMetadata(sitewide, {
          status: sitewide.robotsTxt.status,
          statusCode: sitewide.robotsTxt.fetchStatusCode,
          retryable: true,
          reasonCode: String(sitewide.robotsTxt.error ?? "").toLowerCase().includes("timeout")
            ? "timeout"
            : "upstream_fetch_failed",
        }),
        "Retry this audit to re-check the root robots.txt file."
      );
    }

    if (sitewide.robotsTxt.status === "missing" || sitewide.robotsTxt.status === "unavailable") {
      return issueCheck(
        "site-robots-txt-availability",
        "Root robots.txt is missing or unreachable",
        "medium",
        "Publish a reachable robots.txt file at the site root so crawlers can read sitewide crawl rules and sitemap declarations.",
        sitewide.robotsTxt.fetchStatusCode
          ? `robots.txt returned HTTP ${sitewide.robotsTxt.fetchStatusCode}.`
          : "The audit could not reach the root robots.txt file.",
        "robots.txt",
        "site-robots-txt-availability",
        sitewideMetadata(sitewide, {
          status: sitewide.robotsTxt.status,
          statusCode: sitewide.robotsTxt.fetchStatusCode,
        })
      );
    }

    return passedCheck(
      "site-robots-txt-availability",
      "Root robots.txt is available",
      "The site root exposes a reachable robots.txt file.",
      "robots.txt",
      "site-robots-txt-availability",
      sitewideMetadata(sitewide, {
        status: sitewide.robotsTxt.status,
        statusCode: sitewide.robotsTxt.fetchStatusCode,
      })
    );
  },
});

const siteSitemapHealth = defineRule({
  id: "site-sitemap-health",
  label: "Site Sitemap Health",
  packId: "sitewide",
  scoreWeight: 3,
  priority: 14,
  problemFamily: "sitewide_sitemaps",
  check: (sitewide) => {
    if (sitewide.sitemap.status === "unavailable") {
      return systemErrorCheck(
        "site-sitemap-health",
        "Couldn't verify sitemap health",
        "The audit could not complete sitemap discovery or retrieval.",
        "sitemap.xml",
        "site-sitemap-health",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.status,
          retryable: true,
          reasonCode: "upstream_fetch_failed",
        }),
        "Retry this audit to re-check sitemap availability."
      );
    }

    if (sitewide.sitemap.status === "missing") {
      return issueCheck(
        "site-sitemap-health",
        "No sitemap was discovered",
        "medium",
        "Publish a sitemap and make it discoverable from robots.txt or /sitemap.xml.",
        "The audit did not find a usable sitemap for this origin.",
        "sitemap.xml",
        "site-sitemap-health",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.status,
          fieldCount: sitewide.sitemap.sameOriginUrlCount,
        })
      );
    }

    if (sitewide.sitemap.status === "invalid") {
      return issueCheck(
        "site-sitemap-health",
        "Declared sitemap is broken or invalid",
        "high",
        "Repair the declared sitemap files so they return valid sitemap XML and usable same-origin URLs.",
        `Processed ${sitewide.sitemap.processedSitemapCount} sitemap file${sitewide.sitemap.processedSitemapCount === 1 ? "" : "s"}, but at least one declared sitemap was broken or invalid.`,
        "sitemap.xml",
        "site-sitemap-health",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.status,
          fieldCount: sitewide.sitemap.processedSitemapCount,
        })
      );
    }

    if (sitewide.sitemap.status === "empty") {
      return issueCheck(
        "site-sitemap-health",
        "Sitemap does not expose usable same-origin URLs",
        "high",
        "Ensure the sitemap exposes at least one crawlable same-origin HTML URL.",
        `The sitemap yielded ${sitewide.sitemap.sameOriginUrlCount} same-origin HTML URL${sitewide.sitemap.sameOriginUrlCount === 1 ? "" : "s"}.`,
        "sitemap.xml",
        "site-sitemap-health",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.status,
          fieldCount: sitewide.sitemap.sameOriginUrlCount,
        })
      );
    }

    return passedCheck(
      "site-sitemap-health",
      "Sitemap discovery is healthy",
      `The sitewide pass discovered ${sitewide.sitemap.sameOriginUrlCount} same-origin HTML URL${sitewide.sitemap.sameOriginUrlCount === 1 ? "" : "s"} from sitemap data.`,
      "sitemap.xml",
      "site-sitemap-health",
      sitewideMetadata(sitewide, {
        status: sitewide.sitemap.status,
        fieldCount: sitewide.sitemap.sameOriginUrlCount,
      })
    );
  },
});

const siteSitemapRobotsAlignment = defineRule({
  id: "site-sitemap-robots-alignment",
  label: "Site Sitemap robots.txt Alignment",
  packId: "sitewide",
  scoreWeight: 1,
  priority: 15,
  problemFamily: "sitewide_sitemaps",
  check: (sitewide) => {
    if (sitewide.sitemap.discoveryMethod === "none") {
      return notApplicableCheck(
        "site-sitemap-robots-alignment",
        "robots.txt sitemap alignment will be evaluated after a sitemap exists",
        "This check needs a discovered sitemap before robots.txt alignment can be evaluated.",
        "robots.txt, sitemap.xml",
        "site-sitemap-robots-alignment",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.discoveryMethod,
          blockedBy: ["site-sitemap-health"],
          reasonCode: "missing_prerequisite",
        }),
        "When a sitemap exists, robots.txt should declare at least one sitemap URL explicitly."
      );
    }

    if (
      sitewide.sitemap.discoveryMethod === "fallback" &&
      sitewide.robotsTxt.declaredSitemapUrls.length === 0
    ) {
      return issueCheck(
        "site-sitemap-robots-alignment",
        "robots.txt does not declare the sitemap",
        "low",
        "Declare the sitemap URL in robots.txt so crawlers can discover it explicitly.",
        "The audit found a sitemap via /sitemap.xml fallback rather than from robots.txt declarations.",
        "robots.txt, sitemap.xml",
        "site-sitemap-robots-alignment",
        sitewideMetadata(sitewide, {
          status: sitewide.sitemap.discoveryMethod,
          fieldCount: sitewide.robotsTxt.declaredSitemapUrls.length,
        })
      );
    }

    return passedCheck(
      "site-sitemap-robots-alignment",
      "robots.txt declares sitemap discovery cleanly",
      "At least one sitemap URL was declared directly in robots.txt.",
      "robots.txt, sitemap.xml",
      "site-sitemap-robots-alignment",
      sitewideMetadata(sitewide, {
        status: sitewide.sitemap.discoveryMethod,
        fieldCount: sitewide.robotsTxt.declaredSitemapUrls.length,
      })
    );
  },
});

const siteSampleIndexability = defineRule({
  id: "site-sample-indexability",
  label: "Site Sample Indexability",
  packId: "sitewide",
  scoreWeight: 2,
  priority: 16,
  problemFamily: "sitewide_sample_coverage",
  check: (sitewide) => {
    if (sitewide.sampleCoverage.sampledUrlCount === 0) {
      return systemErrorCheck(
        "site-sample-indexability",
        "Couldn't evaluate sample URL indexability",
        "The sitewide pass did not produce any sample URLs to evaluate.",
        "document",
        "site-sample-indexability",
        sitewideMetadata(sitewide, {
          status: "unavailable",
          retryable: true,
          reasonCode: "upstream_fetch_failed",
        }),
        "Retry this audit to rebuild the sitewide sample set."
      );
    }

    const ratio = sitewide.sampleCoverage.indexableCoverageRatio;
    if (ratio < 0.5) {
      return issueCheck(
        "site-sample-indexability",
        "Too few sampled URLs are indexable",
        "high",
        "Raise the share of sampled URLs that return reachable HTML, allow crawling, and avoid noindex directives.",
        `${sitewide.sampleCoverage.indexableUrlCount} of ${sitewide.sampleCoverage.sampledUrlCount} sampled URLs were indexable (${percentLabel(ratio)}).`,
        "document",
        "site-sample-indexability",
        sitewideMetadata(sitewide, {
          status: "below_half",
          fieldCount: sitewide.sampleCoverage.indexableUrlCount,
          minimumRecommendedCount: sitewide.sampleCoverage.sampledUrlCount,
        })
      );
    }

    if (ratio < sitewide.sampleCoverage.minimumPassingRatio) {
      return issueCheck(
        "site-sample-indexability",
        "Sampled URL indexability is below the target threshold",
        "medium",
        "Improve crawlability and indexing readiness across the sampled URLs until at least 80% are indexable.",
        `${sitewide.sampleCoverage.indexableUrlCount} of ${sitewide.sampleCoverage.sampledUrlCount} sampled URLs were indexable (${percentLabel(ratio)}).`,
        "document",
        "site-sample-indexability",
        sitewideMetadata(sitewide, {
          status: "below_target",
          fieldCount: sitewide.sampleCoverage.indexableUrlCount,
          minimumRecommendedCount: sitewide.sampleCoverage.sampledUrlCount,
        })
      );
    }

    return passedCheck(
      "site-sample-indexability",
      "Sampled URLs are mostly indexable",
      `${sitewide.sampleCoverage.indexableUrlCount} of ${sitewide.sampleCoverage.sampledUrlCount} sampled URLs met the sitewide indexability bar.`,
      "document",
      "site-sample-indexability",
      sitewideMetadata(sitewide, {
        status: "healthy",
        fieldCount: sitewide.sampleCoverage.indexableUrlCount,
        minimumRecommendedCount: sitewide.sampleCoverage.sampledUrlCount,
      })
    );
  },
});

const siteSampleBasicsCoverage = defineRule({
  id: "site-sample-basics-coverage",
  label: "Site Sample Basics Coverage",
  packId: "sitewide",
  scoreWeight: 2,
  priority: 17,
  problemFamily: "sitewide_sample_coverage",
  check: (sitewide) => {
    if (sitewide.sampleCoverage.sampledUrlCount === 0) {
      return systemErrorCheck(
        "site-sample-basics-coverage",
        "Couldn't evaluate sampled basic SEO coverage",
        "The sitewide pass did not produce any sample URLs to evaluate.",
        "document",
        "site-sample-basics-coverage",
        sitewideMetadata(sitewide, {
          status: "unavailable",
          retryable: true,
          reasonCode: "upstream_fetch_failed",
        }),
        "Retry this audit to rebuild the sitewide sample set."
      );
    }

    const coverageRatios = [
      sitewide.sampleCoverage.titleCoverageRatio,
      sitewide.sampleCoverage.metaDescriptionCoverageRatio,
      sitewide.sampleCoverage.canonicalCoverageRatio,
    ];
    const weakestRatio = Math.min(...coverageRatios);

    if (weakestRatio < 0.5) {
      return issueCheck(
        "site-sample-basics-coverage",
        "Sampled URLs are missing core SEO basics too often",
        "medium",
        "Raise title, meta description, and canonical coverage across the sampled URLs until each basic exceeds 80%.",
        `Title coverage is ${percentLabel(sitewide.sampleCoverage.titleCoverageRatio)}, meta description coverage is ${percentLabel(sitewide.sampleCoverage.metaDescriptionCoverageRatio)}, and canonical coverage is ${percentLabel(sitewide.sampleCoverage.canonicalCoverageRatio)}.`,
        "document",
        "site-sample-basics-coverage",
        sitewideMetadata(sitewide, {
          status: "below_half",
          fieldCount: sitewide.sampleCoverage.sampledUrlCount,
        })
      );
    }

    if (weakestRatio < sitewide.sampleCoverage.minimumPassingRatio) {
      return issueCheck(
        "site-sample-basics-coverage",
        "Sampled basic SEO coverage is below the target threshold",
        "low",
        "Improve title, meta description, and canonical coverage across the sampled URLs until each basic exceeds 80%.",
        `Title coverage is ${percentLabel(sitewide.sampleCoverage.titleCoverageRatio)}, meta description coverage is ${percentLabel(sitewide.sampleCoverage.metaDescriptionCoverageRatio)}, and canonical coverage is ${percentLabel(sitewide.sampleCoverage.canonicalCoverageRatio)}.`,
        "document",
        "site-sample-basics-coverage",
        sitewideMetadata(sitewide, {
          status: "below_target",
          fieldCount: sitewide.sampleCoverage.sampledUrlCount,
        })
      );
    }

    return passedCheck(
      "site-sample-basics-coverage",
      "Sampled URLs expose core SEO basics consistently",
      "The sitewide sample maintained healthy title, meta description, and canonical coverage.",
      "document",
      "site-sample-basics-coverage",
      sitewideMetadata(sitewide, {
        status: "healthy",
        fieldCount: sitewide.sampleCoverage.sampledUrlCount,
      })
    );
  },
});

const siteSitemapUrlHygiene = defineRule({
  id: "site-sitemap-url-hygiene",
  label: "Site Sitemap URL Hygiene",
  packId: "sitewide",
  scoreWeight: 3,
  priority: 18,
  problemFamily: "sitewide_sitemap_hygiene",
  check: (sitewide) => {
    const health = sitewide.sitemapSampleHealth;

    if (health.sampledSitemapUrlCount === 0) {
      return notApplicableCheck(
        "site-sitemap-url-hygiene",
        "Sitemap URL hygiene will be evaluated after sitemap URLs enter the sample",
        "This check needs sampled sitemap URLs before sitemap URL hygiene can be evaluated.",
        "sitemap.xml",
        "site-sitemap-url-hygiene",
        sitewideMetadata(sitewide, {
          status: "missing_prerequisite",
          reasonCode: "missing_prerequisite",
          blockedBy: ["site-sitemap-health"],
        }),
        "A healthy sitemap points directly to indexable, canonical HTML URLs rather than redirects, broken pages, or noindex targets."
      );
    }

    if (health.brokenUrlCount > 0 || health.noindexUrlCount > 0) {
      return issueCheck(
        "site-sitemap-url-hygiene",
        "Sampled sitemap URLs include broken or noindex targets",
        "high",
        "Keep sitemap entries limited to reachable indexable canonical HTML URLs.",
        `The sampled sitemap URLs included ${pluralize(health.brokenUrlCount, "broken URL")} and ${pluralize(health.noindexUrlCount, "noindex URL")}.`,
        "sitemap.xml",
        "site-sitemap-url-hygiene",
        sitewideMetadata(sitewide, {
          status: "broken_or_noindex",
          fieldCount: health.sampledSitemapUrlCount,
        })
      );
    }

    if (health.redirectedUrlCount > 0 || health.nonCanonicalUrlCount > 0) {
      return issueCheck(
        "site-sitemap-url-hygiene",
        "Sampled sitemap URLs are not clean canonical targets",
        "medium",
        "List only final canonical URLs in the sitemap instead of redirects or URLs canonically pointing elsewhere.",
        `The sampled sitemap URLs included ${pluralize(health.redirectedUrlCount, "redirecting URL")} and ${pluralize(health.nonCanonicalUrlCount, "non-canonical URL")}.`,
        "sitemap.xml",
        "site-sitemap-url-hygiene",
        sitewideMetadata(sitewide, {
          status: "redirect_or_noncanonical",
          fieldCount: health.sampledSitemapUrlCount,
        })
      );
    }

    return passedCheck(
      "site-sitemap-url-hygiene",
      "Sampled sitemap URLs are clean",
      "The sampled sitemap URLs resolved as reachable canonical HTML pages without noindex directives.",
      "sitemap.xml",
      "site-sitemap-url-hygiene",
      sitewideMetadata(sitewide, {
        status: "healthy",
        fieldCount: health.sampledSitemapUrlCount,
      })
    );
  },
});

const siteDiscoveryAlignment = defineRule({
  id: "site-discovery-alignment",
  label: "Site Discovery Alignment",
  packId: "sitewide",
  scoreWeight: 2,
  priority: 19,
  problemFamily: "sitewide_discovery_alignment",
  check: (sitewide) => {
    const alignment = sitewide.discoveryAlignment;

    if (
      alignment.sampledSitemapUrlCount === 0 &&
      alignment.sampledDiscoveryUrlCount === 0
    ) {
      return notApplicableCheck(
        "site-discovery-alignment",
        "Discovery alignment will be evaluated after the sample includes sitemap or internal URLs",
        "This check needs sampled sitemap URLs or internal discovery URLs before alignment can be evaluated.",
        "document",
        "site-discovery-alignment",
        sitewideMetadata(sitewide, {
          status: "missing_prerequisite",
          reasonCode: "missing_prerequisite",
          blockedBy: ["site-sitemap-health", "site-sample-indexability"],
        }),
        "A healthy site keeps key internally discoverable URLs aligned with sitemap coverage."
      );
    }

    const mismatchCount =
      alignment.sitemapUrlsMissingInternalDiscovery.length +
      alignment.internalUrlsMissingFromSitemap.length;
    const denominator = Math.max(
      alignment.sampledSitemapUrlCount,
      alignment.sampledDiscoveryUrlCount,
      1
    );
    const mismatchRatio = mismatchCount / denominator;

    if (mismatchRatio >= 0.5 && mismatchCount > 0) {
      return issueCheck(
        "site-discovery-alignment",
        "Sitemap coverage and internal discovery are misaligned",
        "medium",
        "Align sitemap entries and internal discovery paths so important URLs appear consistently in both signals.",
        `${pluralize(alignment.sitemapUrlsMissingInternalDiscovery.length, "sampled sitemap URL")} lacked internal discovery support, and ${pluralize(alignment.internalUrlsMissingFromSitemap.length, "sampled internal URL")} were absent from sitemap coverage.`,
        "document",
        "site-discovery-alignment",
        sitewideMetadata(sitewide, {
          status: "misaligned",
          fieldCount: mismatchCount,
        })
      );
    }

    if (mismatchCount > 0) {
      return issueCheck(
        "site-discovery-alignment",
        "Sitemap and internal discovery are only partially aligned",
        "low",
        "Tighten sitemap coverage and internal discovery so important URLs are reinforced consistently.",
        `${pluralize(alignment.sitemapUrlsMissingInternalDiscovery.length, "sampled sitemap URL")} lacked internal discovery support, and ${pluralize(alignment.internalUrlsMissingFromSitemap.length, "sampled internal URL")} were absent from sitemap coverage.`,
        "document",
        "site-discovery-alignment",
        sitewideMetadata(sitewide, {
          status: "partial_alignment",
          fieldCount: mismatchCount,
        })
      );
    }

    return passedCheck(
      "site-discovery-alignment",
      "Sitemap and internal discovery are aligned on the sample",
      "The bounded sample showed consistent overlap between sitemap coverage and internally discoverable URLs.",
      "document",
      "site-discovery-alignment",
      sitewideMetadata(sitewide, {
        status: "aligned",
        fieldCount: alignment.alignedUrlCount,
      })
    );
  },
});

export const sitewideRules = [
  siteHostCanonicalization,
  siteRobotsTxtAvailability,
  siteSitemapHealth,
  siteSitemapRobotsAlignment,
  siteSampleIndexability,
  siteSampleBasicsCoverage,
  siteSitemapUrlHygiene,
  siteDiscoveryAlignment,
];
