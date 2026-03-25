import type { LucideIcon } from "lucide-react";

export type AuditTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "critical"
  | "pending";

export type AuditCheckKind = "issue" | "passed" | "not_applicable" | "system_error";

export type AuditMessageSection = {
  label: string;
  body: string;
};

export type AuditCheckRowModel = {
  id: string;
  kind: AuditCheckKind;
  title: string;
  problemFamily: string;
  problemFamilyLabel: string;
  packLabel: string | null;
  evidenceSourceLabel: string | null;
  severityLabel: string | null;
  tone: AuditTone;
  messageSections: AuditMessageSection[];
  selector: string | null;
  metric: string | null;
  isHero?: boolean;
};

export type AuditFamilyChecklistGroupModel = {
  id: string;
  title: string;
  issueCount: number;
  passedCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  rows: AuditCheckRowModel[];
};

export type AuditStreamRowModel = {
  id: string;
  title: string;
  timestampLabel: string;
  selector: string | null;
  messageSections: AuditMessageSection[];
  severityLabel: string | null;
  tone: AuditTone;
  state:
    | "neutral"
    | "issue"
    | "passed"
    | "not_applicable"
    | "system_error"
    | "error"
    | "complete";
};

export type AuditCategoryScoreModel = {
  key: string;
  label: string;
  score: number;
  tone: Exclude<AuditTone, "pending">;
};

export type AuditHeaderModel = {
  statusLabel: string;
  statusTone: AuditTone;
  targetUrlLabel: string;
  targetUrlHref: string | null;
  title: string;
  titleTone: "default" | "success" | "critical";
  titleIcon: LucideIcon;
  titleIconClassName: string;
  errorMessage: string | null;
};
