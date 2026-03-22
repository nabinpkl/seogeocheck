export const AUDIT_STATUSES = [
  "QUEUED",
  "STREAMING",
  "COMPLETE",
  "FAILED",
  "VERIFIED",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export type AuditStreamEvent = {
  jobId?: string;
  eventId?: string;
  timestamp?: string;
  type?: string;
  status?: AuditStatus;
  checkStatus?: string;
  message?: string;
  progress?: number;
  severity?: string;
  selector?: string;
  instruction?: string;
  detail?: string;
  metric?: string;
  [key: string]: unknown;
};

export type AuditReportCheck = {
  id?: string;
  label?: string;
  status?: string;
  severity?: string;
  selector?: string;
  instruction?: string;
  detail?: string;
  metric?: string;
  metadata?: {
    evidenceSource?: string;
    problemFamily?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type AuditReport = {
  jobId?: string;
  status?: string;
  generatedAt?: string;
  targetUrl?: string;
  reportType?: string;
  indexabilityVerdict?: string;
  summary?: {
    score?: number;
    topIssue?: string;
    status?: string;
    indexabilityVerdict?: string;
    targetUrl?: string;
    issueCount?: number;
    passedCheckCount?: number;
    notApplicableCount?: number;
    systemErrorCount?: number;
    [key: string]: unknown;
  };
  checks?: AuditReportCheck[];
  categories?: Record<string, number>;
  rawSummary?: {
    worker?: string;
    statusCode?: number;
    contentType?: string;
    wordCount?: number;
    capturePasses?: string[];
    sourceHtml?: {
      wordCount?: number;
      sameOriginCrawlableLinkCount?: number;
      nonCrawlableLinkCount?: number;
      emptyAnchorTextCount?: number;
      genericAnchorTextCount?: number;
      metaRefreshTagCount?: number;
      headingOutlineCount?: number;
      headingHierarchySkipCount?: number;
      emptyHeadingCount?: number;
      repeatedHeadingCount?: number;
      linkedImageCount?: number;
      linkedImageMissingAltCount?: number;
      bodyImageCount?: number;
      eligibleBodyImageCount?: number;
      bodyImageMissingAltCount?: number;
      structuredDataKinds?: string[];
      [key: string]: unknown;
    };
    renderedDom?: {
      wordCount?: number;
      sameOriginCrawlableLinkCount?: number;
      nonCrawlableLinkCount?: number;
      emptyAnchorTextCount?: number;
      genericAnchorTextCount?: number;
      metaRefreshTagCount?: number;
      headingOutlineCount?: number;
      headingHierarchySkipCount?: number;
      emptyHeadingCount?: number;
      repeatedHeadingCount?: number;
      linkedImageCount?: number;
      linkedImageMissingAltCount?: number;
      bodyImageCount?: number;
      eligibleBodyImageCount?: number;
      bodyImageMissingAltCount?: number;
      structuredDataKinds?: string[];
      [key: string]: unknown;
    } | null;
    renderComparison?: {
      sourceOnlyCriticalIssues?: number;
      renderedOnlySignals?: number;
      mismatches?: number;
      renderDependencyRisk?: string;
      [key: string]: unknown;
    };
    xRobotsTag?: {
      value?: string | null;
      blocksIndexing?: boolean;
      [key: string]: unknown;
    };
    robotsControl?: {
      status?: string;
      effectiveIndexing?: string | null;
      effectiveFollowing?: string | null;
      effectiveSnippet?: string | null;
      effectiveArchive?: string | null;
      effectiveTranslate?: string | null;
      effectiveMaxSnippet?: string | null;
      effectiveMaxImagePreview?: string | null;
      effectiveMaxVideoPreview?: string | null;
      effectiveTarget?: string | null;
      hasBlockingNoindex?: boolean;
      hasNoarchiveDirective?: boolean;
      hasNotranslateDirective?: boolean;
      entries?: Array<Record<string, unknown>>;
      sameTargetConflicts?: Array<Record<string, unknown>>;
      targetedOverrides?: Array<Record<string, unknown>>;
      unsupportedTokens?: string[];
      malformedTokens?: string[];
      [key: string]: unknown;
    };
    canonicalControl?: {
      status?: string;
      uniqueTargetCount?: number;
      uniqueTargets?: string[];
      htmlCount?: number;
      headerCount?: number;
      resolvedCanonicalUrl?: string | null;
      consistency?: string;
      candidates?: Array<Record<string, unknown>>;
      invalidCandidates?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    canonicalSelfReferenceControl?: {
      status?: string;
      expectsSelfReference?: boolean;
      finalUrl?: string | null;
      resolvedCanonicalUrl?: string | null;
      [key: string]: unknown;
    };
    metaRefreshControl?: {
      status?: string;
      tagCount?: number;
      immediateRedirectCount?: number;
      timedRedirectCount?: number;
      malformedCount?: number;
      refreshOnlyCount?: number;
      entries?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    alternateLanguageControl?: {
      status?: string;
      annotations?: Array<Record<string, unknown>>;
      validAnnotations?: Array<Record<string, unknown>>;
      invalidAnnotations?: Array<Record<string, unknown>>;
      conflicts?: Array<Record<string, unknown>>;
      groupedByLanguage?: Record<string, unknown>;
      [key: string]: unknown;
    };
    linkDiscoveryControl?: {
      status?: string;
      internalCrawlableLinkCount?: number;
      internalNofollowCount?: number;
      blockedByRelCount?: number;
      affectedLinks?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    internalLinkCoverageControl?: {
      status?: string;
      sameOriginCrawlableLinkCount?: number;
      minimumRecommendedCount?: number;
      [key: string]: unknown;
    };
    headingQualityControl?: {
      status?: string;
      emptyHeadingCount?: number;
      repeatedHeadingCount?: number;
      firstHeadingNotH1?: boolean;
      repeatedHeadings?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    bodyImageAltControl?: {
      status?: string;
      totalImageCount?: number;
      eligibleImageCount?: number;
      missingAltCount?: number;
      excludedMissingSrcCount?: number;
      excludedDecorativeCount?: number;
      excludedTrackingPixelCount?: number;
      missingAltImages?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    langControl?: {
      status?: string;
      value?: string | null;
      canonicalValue?: string | null;
      [key: string]: unknown;
    };
    socialUrlControl?: {
      status?: string;
      fieldCount?: number;
      invalidFields?: Array<Record<string, unknown>>;
      fields?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    metadataAlignmentControl?: {
      status?: string;
      firstH1Text?: string | null;
      titleSharedTokenCount?: number;
      metaDescriptionSharedTokenCount?: number;
      titleH1Mismatch?: boolean;
      weakMetaDescriptionAlignment?: boolean;
      [key: string]: unknown;
    };
    robotsTxt?: {
      status?: string;
      allowsCrawl?: boolean | null;
      evaluatedUserAgent?: string | null;
      matchedDirective?: string | null;
      matchedPattern?: string | null;
      fetchStatusCode?: number | null;
      url?: string;
      finalUrl?: string | null;
      error?: string | null;
      [key: string]: unknown;
    };
    redirectChain?: {
      status?: string;
      totalRedirects?: number;
      finalUrlChanged?: boolean;
      finalUrl?: string | null;
      chain?: Array<{
        url?: string;
        statusCode?: number | null;
        location?: string | null;
        [key: string]: unknown;
      }>;
      error?: string | null;
      [key: string]: unknown;
    };
    indexabilityVerdict?: {
      verdict?: string;
      blockingSignals?: string[];
      riskSignals?: string[];
      unknownSignals?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  signature?: {
    present?: boolean;
    algorithm?: string;
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
