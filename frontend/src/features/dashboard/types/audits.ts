export type DashboardAuditSummary = {
  jobId: string;
  targetUrl: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  score: number | null;
};
