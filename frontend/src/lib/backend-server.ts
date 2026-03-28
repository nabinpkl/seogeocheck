import "server-only";

import { cookies } from "next/headers";
import type { DashboardAuditSummary } from "@/features/dashboard/types/audits";
import type {
  DashboardProjectSummary,
  ProjectTrackedUrlSummary,
} from "@/features/dashboard/types/projects";
import type { AuditReport } from "@/types/audit";

const BACKEND_SESSION_COOKIE = "seogeo_session";
const BACKEND_CSRF_COOKIE = "XSRF-TOKEN";

type CsrfPayload = {
  headerName?: string;
  token?: string;
};

type BackendErrorPayload = {
  error?: string;
  message?: string;
};

export type AccountAuditSummary = DashboardAuditSummary;
export type AccountProjectSummary = DashboardProjectSummary;
export type AccountProjectTrackedUrlSummary = ProjectTrackedUrlSummary;

export type ProjectMutationInput = {
  name: string;
  description?: string | null;
};

export class BackendRequestError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
    this.code = code;
  }
}

type ParsedSetCookie = {
  name: string;
  value: string;
};

export function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080"
  );
}

export function buildBackendUrl(path: string) {
  return new URL(path, getBackendBaseUrl()).toString();
}

function buildCookieHeader(entries: Array<[string, string | null | undefined]>) {
  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function parseSetCookieHeader(setCookie: string): ParsedSetCookie {
  const [cookiePart] = setCookie.split(";", 1);
  const separatorIndex = cookiePart.indexOf("=");
  const name = separatorIndex >= 0 ? cookiePart.slice(0, separatorIndex).trim() : cookiePart.trim();
  const value = separatorIndex >= 0 ? cookiePart.slice(separatorIndex + 1) : "";
  return { name, value };
}

async function getBackendSessionCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get(BACKEND_SESSION_COOKIE)?.value ?? null;
}

async function fetchCsrfContext(sessionCookieValue: string | null) {
  const response = await fetch(buildBackendUrl("/auth/csrf"), {
    method: "GET",
    headers: sessionCookieValue
      ? {
          Cookie: buildCookieHeader([[BACKEND_SESSION_COOKIE, sessionCookieValue]]),
        }
      : undefined,
    cache: "no-store",
  });
  const payload = (await parseJsonResponse<CsrfPayload>(response)) ?? {};
  const csrfCookie = response.headers
    .getSetCookie()
    .map(parseSetCookieHeader)
    .find((cookie) => cookie.name === BACKEND_CSRF_COOKIE);

  if (!payload.headerName || !payload.token || !csrfCookie?.value) {
    throw new Error("Backend CSRF handshake failed.");
  }

  return {
    headerName: payload.headerName,
    token: payload.token,
    csrfCookieValue: csrfCookie.value,
  };
}

export async function backendFetchWithSession(path: string, init?: RequestInit) {
  const sessionCookieValue = await getBackendSessionCookieValue();
  const headers = new Headers(init?.headers);

  if (sessionCookieValue && !headers.has("Cookie")) {
    headers.set(
      "Cookie",
      buildCookieHeader([[BACKEND_SESSION_COOKIE, sessionCookieValue]])
    );
  }

  return fetch(buildBackendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function backendJsonWithSession<TResponse>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
) {
  const sessionCookieValue = await getBackendSessionCookieValue();
  const csrfContext = await fetchCsrfContext(sessionCookieValue);
  const headers = new Headers({
    [csrfContext.headerName]: csrfContext.token,
    Cookie: buildCookieHeader([
      [BACKEND_SESSION_COOKIE, sessionCookieValue],
      [BACKEND_CSRF_COOKIE, csrfContext.csrfCookieValue],
    ]),
  });

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildBackendUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseJsonResponse<BackendErrorPayload>(response);
    throw new BackendRequestError(
      payload?.message ?? "We couldn't complete that request.",
      response.status,
      payload?.error ?? null
    );
  }

  return (await parseJsonResponse<TResponse>(response)) ?? null;
}

export async function parseJsonResponse<T>(response: Response) {
  const body = await response.text();
  if (!body) {
    return null as T | null;
  }

  return JSON.parse(body) as T;
}

export async function getAccountAudits(projectSlug?: string | null) {
  const search = projectSlug ? `?projectSlug=${encodeURIComponent(projectSlug)}` : "";
  const response = await backendFetchWithSession(`/account/audits${search}`, {
    method: "GET",
  });

  if (!response.ok) {
    return [] as AccountAuditSummary[];
  }

  return (await parseJsonResponse<AccountAuditSummary[]>(response)) ?? [];
}

export async function getAccountProjects() {
  const response = await backendFetchWithSession("/account/projects", {
    method: "GET",
  });

  if (!response.ok) {
    return [] as AccountProjectSummary[];
  }

  return (await parseJsonResponse<AccountProjectSummary[]>(response)) ?? [];
}

export async function getAccountProject(slug: string) {
  const response = await backendFetchWithSession(`/account/projects/${slug}`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  return (await parseJsonResponse<AccountProjectSummary>(response)) ?? null;
}

export async function getAccountProjectUrls(slug: string) {
  const response = await backendFetchWithSession(`/account/projects/${slug}/urls`, {
    method: "GET",
  });

  if (!response.ok) {
    return [] as AccountProjectTrackedUrlSummary[];
  }

  return (await parseJsonResponse<AccountProjectTrackedUrlSummary[]>(response)) ?? [];
}

export async function getAccountProjectAudits(slug: string, trackedUrl?: string | null) {
  const search = trackedUrl ? `?url=${encodeURIComponent(trackedUrl)}` : "";
  const response = await backendFetchWithSession(`/account/projects/${slug}/audits${search}`, {
    method: "GET",
  });

  if (!response.ok) {
    return [] as AccountAuditSummary[];
  }

  return (await parseJsonResponse<AccountAuditSummary[]>(response)) ?? [];
}

export async function createProject(input: ProjectMutationInput) {
  return backendJsonWithSession<AccountProjectSummary>("/account/projects", "POST", input);
}

export async function updateProject(slug: string, input: ProjectMutationInput) {
  return backendJsonWithSession<AccountProjectSummary>(
    `/account/projects/${slug}`,
    "PATCH",
    input
  );
}

export async function attachAuditToProject(slug: string, jobId: string) {
  return backendJsonWithSession<AccountAuditSummary>(
    `/account/projects/${slug}/audits/${jobId}`,
    "POST"
  );
}

export async function detachAuditFromProject(slug: string, jobId: string) {
  await backendJsonWithSession<null>(`/account/projects/${slug}/audits/${jobId}`, "DELETE");
}

export async function getOwnedAuditReport(jobId: string) {
  const response = await backendFetchWithSession(`/audits/${jobId}/report`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  return (await parseJsonResponse<AuditReport>(response)) ?? null;
}
