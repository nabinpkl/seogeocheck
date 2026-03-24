import type { AuditReport as GeneratedAuditReport } from "./generated/audit-report";
import type { AuditStreamEvent as GeneratedAuditStreamEvent } from "./generated/audit-stream-event";

export const AUDIT_STATUSES = [
  "QUEUED",
  "STREAMING",
  "COMPLETE",
  "FAILED",
  "VERIFIED",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export type AuditStreamEvent = GeneratedAuditStreamEvent;
export type AuditReport = GeneratedAuditReport;
export type AuditReportCheck = AuditReport["checks"][number];
