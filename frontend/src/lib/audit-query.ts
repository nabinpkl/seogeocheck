export const auditReportQueryKey = (jobId: string) =>
  ["audit-report", jobId] as const;

export class ReportPendingError extends Error {
  readonly status = 202;

  constructor(message = "Your results are still being prepared.") {
    super(message);
    this.name = "ReportPendingError";
  }
}
