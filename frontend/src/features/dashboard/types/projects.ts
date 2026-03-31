export type ProjectScoreTrend = {
  improvedUrlCount: number;
  declinedUrlCount: number;
  flatUrlCount: number;
  netScoreDelta: number;
} | null;

export type ProjectTopIssue = {
  key: string;
  label: string;
  severity: string;
  affectedUrlCount: number;
  exampleInstruction: string | null;
};

export type DashboardProjectSummary = {
  id: string;
  slug: string;
  isDefault: boolean;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  trackedUrlCount: number;
  verifiedUrlCount: number;
  auditCount: number;
  activeAuditCount: number;
  latestAuditAt: string | null;
  projectScore: number | null;
  scoreTrend: ProjectScoreTrend;
  criticalIssueCount: number;
  affectedUrlCount: number;
  topIssues: ProjectTopIssue[];
};

export type ProjectTrackedUrlSummary = {
  id: string;
  trackedUrl: string;
  normalizedUrl: string;
  normalizedHost: string;
  normalizedPath: string;
  auditCount: number;
  latestAuditAt: string | null;
  latestAuditStatus: string | null;
  latestVerifiedAt: string | null;
  currentScore: number | null;
  currentCriticalIssueCount: number;
};
