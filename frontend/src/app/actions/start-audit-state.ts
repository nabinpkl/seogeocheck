export type StartAuditActionState = {
  ok: boolean;
  error: string | null;
  jobId: string | null;
  status: string | null;
  targetUrl: string;
  streamUrl: string | null;
  reportUrl: string | null;
};

export const initialAuditActionState: StartAuditActionState = {
  ok: false,
  error: null,
  jobId: null,
  status: null,
  targetUrl: "",
  streamUrl: null,
  reportUrl: null,
};
