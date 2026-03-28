import "server-only";

import { cookies } from "next/headers";
import type { AuditReport } from "@/types/audit";

const BACKEND_SESSION_COOKIE = "seogeo_session";

export type AccountAuditSummary = {
  jobId: string;
  targetUrl: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  score: number | null;
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

async function getBackendSessionCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get(BACKEND_SESSION_COOKIE)?.value ?? null;
}

export async function backendFetchWithSession(
  path: string,
  init?: RequestInit
) {
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

export async function parseJsonResponse<T>(response: Response) {
  const body = await response.text();
  if (!body) {
    return null as T | null;
  }

  return JSON.parse(body) as T;
}

export async function getAccountAudits() {
  const response = await backendFetchWithSession("/account/audits", {
    method: "GET",
  });

  if (!response.ok) {
    return [] as AccountAuditSummary[];
  }

  return (await parseJsonResponse<AccountAuditSummary[]>(response)) ?? [];
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
