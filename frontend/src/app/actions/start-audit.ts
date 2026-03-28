"use server";

import { revalidatePath } from "next/cache";
import {
  attachAuditToProject,
  backendFetchWithSession,
  BackendRequestError,
  parseJsonResponse,
} from "@/lib/backend-server";
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
      body: JSON.stringify({ url: targetUrl }),
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

    let projectWarning: string | null = null;
    if (projectSlug && typeof payload.jobId === "string") {
      try {
        await attachAuditToProject(projectSlug, payload.jobId);
        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/projects/${projectSlug}`);
      } catch (error) {
        projectWarning =
          error instanceof BackendRequestError
            ? "Your audit started, but we couldn't add it to the selected project."
            : "Your audit started, but we couldn't add it to the selected project.";
      }
    }

    return {
      ok: true,
      error: null,
      projectWarning,
      projectSlug,
      jobId: typeof payload.jobId === "string" ? payload.jobId : null,
      status: typeof payload.status === "string" ? payload.status : null,
      targetUrl,
      streamUrl:
        typeof payload.jobId === "string"
          ? `/api/audits/${payload.jobId}/stream`
          : null,
      reportUrl:
        typeof payload.jobId === "string"
          ? `/api/audits/${payload.jobId}/report`
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
