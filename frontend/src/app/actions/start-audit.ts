"use server";

import {
  initialAuditActionState,
  type StartAuditActionState,
} from "./start-audit-state";

export async function startAuditAction(
  _previousState: StartAuditActionState,
  formData: FormData
): Promise<StartAuditActionState> {
  const rawUrl = String(formData.get("url") ?? "").trim();

  if (!rawUrl) {
    return {
      ...initialAuditActionState,
      error: "Enter a website URL to start the audit.",
    };
  }

  const targetUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;

  try {
    new URL(targetUrl);
  } catch {
    return {
      ...initialAuditActionState,
      error: "That URL does not look valid yet.",
      targetUrl,
    };
  }

  const backendUrl =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}/audits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: targetUrl }),
      cache: "no-store",
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        ...initialAuditActionState,
        error:
          typeof payload.message === "string"
            ? payload.message
            : "We couldn't start your audit right now.",
        targetUrl,
      };
    }

    return {
      ok: true,
      error: null,
      jobId: typeof payload.jobId === "string" ? payload.jobId : null,
      status: typeof payload.status === "string" ? payload.status : null,
      targetUrl,
      streamUrl: typeof payload.streamUrl === "string" ? payload.streamUrl : null,
      reportUrl: typeof payload.reportUrl === "string" ? payload.reportUrl : null,
    };
  } catch {
    return {
      ...initialAuditActionState,
      error: "We couldn't start your audit right now. Please try again in a moment.",
      targetUrl,
    };
  }
}
