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
  message?: string;
  progress?: number;
  severity?: string;
  selector?: string;
  instruction?: string;
  [key: string]: unknown;
};

export type AuditReportFinding = {
  id?: string;
  label?: string;
  severity?: string;
  selector?: string;
  instruction?: string;
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
    [key: string]: unknown;
  };
  findings?: AuditReportFinding[];
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
