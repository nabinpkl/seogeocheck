import * as React from "react";

export type AuditTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "critical"
  | "pending";

export type AuditCheckKind = "issue" | "passed";

export type AuditCheckRowModel = {
  id: string;
  kind: AuditCheckKind;
  title: string;
  problemFamily: string;
  problemFamilyLabel: string;
  evidenceSourceLabel: string | null;
  severityLabel: string | null;
  tone: AuditTone;
  summaryLabel: string | null;
  summary: string | null;
  selector: string | null;
  metric: string | null;
  isHero?: boolean;
};

export type AuditFamilyChecklistGroupModel = {
  id: string;
  title: string;
  issueCount: number;
  passedCount: number;
  rows: AuditCheckRowModel[];
};

export type AuditStreamRowModel = {
  id: string;
  title: string;
  timestampLabel: string;
  selector: string | null;
  detail: string | null;
  detailLabel: string;
  severityLabel: string | null;
  tone: AuditTone;
  state: "neutral" | "issue" | "passed" | "error" | "complete";
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
  titleIcon: React.ReactNode;
  errorMessage: string | null;
};
