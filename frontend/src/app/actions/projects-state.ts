export type ProjectActionState = {
  ok: boolean;
  error: string | null;
  projectSlug: string | null;
};

export type AuditProjectActionState = {
  ok: boolean;
  error: string | null;
};

export const initialProjectActionState: ProjectActionState = {
  ok: false,
  error: null,
  projectSlug: null,
};

export const initialAuditProjectActionState: AuditProjectActionState = {
  ok: false,
  error: null,
};
