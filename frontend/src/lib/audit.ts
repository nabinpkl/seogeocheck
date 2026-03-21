export const AUDIT_STATUSES = [
  "QUEUED",
  "STREAMING",
  "COMPLETE",
  "FAILED",
  "VERIFIED",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export type AuditUiStatus = AuditStatus | "IDLE";

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
      linkedImageCount?: number;
      linkedImageMissingAltCount?: number;
      structuredDataKinds?: string[];
      [key: string]: unknown;
    };
    renderedDom?: {
      wordCount?: number;
      sameOriginCrawlableLinkCount?: number;
      nonCrawlableLinkCount?: number;
      emptyAnchorTextCount?: number;
      genericAnchorTextCount?: number;
      linkedImageCount?: number;
      linkedImageMissingAltCount?: number;
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
      effectiveTarget?: string | null;
      hasBlockingNoindex?: boolean;
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

export const auditReportQueryKey = (jobId: string) =>
  ["audit-report", jobId] as const;

export class ReportPendingError extends Error {
  readonly status = 202;

  constructor(message = "Your results are still being prepared.") {
    super(message);
    this.name = "ReportPendingError";
  }
}
