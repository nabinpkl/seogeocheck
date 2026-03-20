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
  summary?: {
    score?: number;
    topIssue?: string;
    status?: string;
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
