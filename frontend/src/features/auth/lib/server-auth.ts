import "server-only";

import { cookies } from "next/headers";

export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

type AuthBackendError = {
  error?: string;
  message?: string;
};

type AuthBackendResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
    }
  | {
      ok: false;
      code: string | null;
      message: string;
      status: number;
    };

type CsrfPayload = {
  headerName?: string;
  token?: string;
};

type ParsedSetCookie = {
  name: string;
  value: string;
  maxAge: number | null;
};

const BACKEND_SESSION_COOKIE = "seogeo_session";
const BACKEND_CSRF_COOKIE = "XSRF-TOKEN";

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080"
  );
}

function buildBackendUrl(path: string) {
  return new URL(path, getBackendBaseUrl()).toString();
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function parseSetCookieHeader(setCookie: string): ParsedSetCookie {
  const [cookiePart, ...attributeParts] = setCookie.split(";");
  const separatorIndex = cookiePart.indexOf("=");
  const name = separatorIndex >= 0 ? cookiePart.slice(0, separatorIndex).trim() : cookiePart.trim();
  const value = separatorIndex >= 0 ? cookiePart.slice(separatorIndex + 1) : "";

  let maxAge: number | null = null;
  for (const attribute of attributeParts) {
    const [attributeName, attributeValue] = attribute.split("=");
    if (attributeName.trim().toLowerCase() !== "max-age") {
      continue;
    }

    const parsed = Number(attributeValue);
    if (Number.isFinite(parsed)) {
      maxAge = parsed;
    }
  }

  return { name, value, maxAge };
}

async function getSessionCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get(BACKEND_SESSION_COOKIE)?.value ?? null;
}

function buildCookieHeader(entries: Array<[string, string | null | undefined]>) {
  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function parseJsonResponse<T>(response: Response) {
  const body = await response.text();
  if (!body) {
    return null as T | null;
  }

  return JSON.parse(body) as T;
}

async function syncSessionCookie(response: Response) {
  const cookieStore = await cookies();
  const sessionCookie = response.headers
    .getSetCookie()
    .map(parseSetCookieHeader)
    .find((cookie) => cookie.name === BACKEND_SESSION_COOKIE);

  if (!sessionCookie) {
    return;
  }

  if (!sessionCookie.value || sessionCookie.maxAge === 0) {
    cookieStore.delete(BACKEND_SESSION_COOKIE);
    return;
  }

  cookieStore.set(BACKEND_SESSION_COOKIE, sessionCookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
  });
}

async function fetchCsrfContext(sessionCookieValue: string | null) {
  const csrfResponse = await fetch(buildBackendUrl("/auth/csrf"), {
    method: "GET",
    headers: sessionCookieValue
      ? {
          Cookie: buildCookieHeader([[BACKEND_SESSION_COOKIE, sessionCookieValue]]),
        }
      : undefined,
    cache: "no-store",
  });

  const payload = (await parseJsonResponse<CsrfPayload>(csrfResponse)) ?? {};
  const csrfCookie = csrfResponse.headers
    .getSetCookie()
    .map(parseSetCookieHeader)
    .find((cookie) => cookie.name === BACKEND_CSRF_COOKIE);

  if (!payload.token || !payload.headerName || !csrfCookie?.value) {
    throw new Error("Backend CSRF handshake failed.");
  }

  return {
    headerName: payload.headerName,
    token: payload.token,
    csrfCookieValue: csrfCookie.value,
  };
}

async function sendJsonWithCsrf<TResponse>(
  method: "POST" | "DELETE",
  path: string,
  body: Record<string, unknown>
): Promise<AuthBackendResult<TResponse>> {
  const sessionCookieValue = await getSessionCookieValue();
  const csrfContext = await fetchCsrfContext(sessionCookieValue);

  const response = await fetch(buildBackendUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      [csrfContext.headerName]: csrfContext.token,
      Cookie: buildCookieHeader([
        [BACKEND_SESSION_COOKIE, sessionCookieValue],
        [BACKEND_CSRF_COOKIE, csrfContext.csrfCookieValue],
      ]),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  await syncSessionCookie(response);
  const payload =
    (await parseJsonResponse<TResponse | AuthBackendError>(response)) ?? null;

  if (!response.ok) {
    const backendError = payload as AuthBackendError | null;
    return {
      ok: false,
      code: backendError?.error ?? null,
      message: backendError?.message ?? "We couldn't complete that request.",
      status: response.status,
    };
  }

  return {
    ok: true,
    data: payload as TResponse,
    status: response.status,
  };
}

export async function getCurrentUser() {
  const sessionCookieValue = await getSessionCookieValue();
  if (!sessionCookieValue) {
    return null;
  }

  const response = await fetch(buildBackendUrl("/auth/me"), {
    method: "GET",
    headers: {
      Cookie: buildCookieHeader([[BACKEND_SESSION_COOKIE, sessionCookieValue]]),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await parseJsonResponse<AuthUser>(response)) ?? null;
}

export async function registerAccount(email: string, password: string) {
  return sendJsonWithCsrf<{ message?: string }>("POST", "/auth/register", {
    email,
    password,
  });
}

export async function registerAccountWithClaim(
  email: string,
  password: string,
  claimToken: string | null
) {
  return sendJsonWithCsrf<{ message?: string }>("POST", "/auth/register", {
    email,
    password,
    claimToken,
  });
}

export async function loginWithPassword(
  email: string,
  password: string,
  claimToken?: string | null
) {
  return sendJsonWithCsrf<{ authenticated?: boolean; user?: AuthUser }>("POST", "/auth/login", {
    email,
    password,
    claimToken,
  });
}

export async function requestPasswordReset(email: string) {
  return sendJsonWithCsrf<{ message?: string }>("POST", "/auth/forgot-password", { email });
}

export async function resetPasswordWithToken(token: string, password: string) {
  return sendJsonWithCsrf<{ reset?: boolean }>("POST", "/auth/reset-password", { token, password });
}

export async function verifyEmailWithToken(token: string) {
  return sendJsonWithCsrf<{ verified?: boolean; authenticated?: boolean }>(
    "POST",
    "/auth/verify-email",
    { token }
  );
}

export async function logoutBackendSession() {
  return sendJsonWithCsrf<null>("POST", "/auth/logout", {});
}

export async function deleteCurrentAccount() {
  return sendJsonWithCsrf<null>("DELETE", "/auth/account", {});
}

export async function clearFrontendSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(BACKEND_SESSION_COOKIE);
}
