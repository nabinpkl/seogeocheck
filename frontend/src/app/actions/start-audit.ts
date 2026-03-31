"use server";

import { revalidatePath } from "next/cache";
import {
  backendFetchWithSession,
  parseJsonResponse,
} from "@/lib/backend-server";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import {
  initialAuditActionState,
  type StartAuditActionState,
} from "./start-audit-state";

export async function startAuditAction(
  _previousState: StartAuditActionState,
  formData: FormData
): Promise<StartAuditActionState> {
  const rawUrl = String(formData.get("url") ?? "").trim();
  const projectSlug = String(formData.get("projectSlug") ?? "").trim() || null;

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

  try {
    const response = await backendFetchWithSession("/audits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        projectSlug,
      }),
    });

    const payload =
      (await parseJsonResponse<Record<string, unknown>>(response)) ?? {};

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

    const resolvedProjectSlug =
      typeof payload.projectSlug === "string" && payload.projectSlug.trim()
        ? payload.projectSlug
        : projectSlug;
    if (resolvedProjectSlug) {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/projects/${resolvedProjectSlug}`);
    }

    const viewer = await getCurrentUser();
    const claimToken =
      typeof payload.claimToken === "string" && payload.claimToken.trim()
        ? payload.claimToken
        : null;
    const claimQuery = claimToken ? `?claim=${encodeURIComponent(claimToken)}` : "";

    return {
      ok: true,
      error: null,
      projectWarning: null,
      projectSlug: resolvedProjectSlug,
      workspaceKind: viewer?.accountKind ?? null,
      claimToken,
      jobId: typeof payload.jobId === "string" ? payload.jobId : null,
      status: typeof payload.status === "string" ? payload.status : null,
      targetUrl,
      streamUrl:
        typeof payload.jobId === "string"
          ? `/api/audits/${payload.jobId}/stream${claimQuery}`
          : null,
      reportUrl:
        typeof payload.jobId === "string"
          ? `/api/audits/${payload.jobId}/report${claimQuery}`
          : null,
    };
  } catch {
    return {
      ...initialAuditActionState,
      error: "We couldn't start your audit right now. Please try again in a moment.",
      targetUrl,
    };
  }
}
