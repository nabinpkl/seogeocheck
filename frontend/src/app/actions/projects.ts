"use server";

import { revalidatePath } from "next/cache";
import {
  attachAuditToProject,
  BackendRequestError,
  createProject,
  detachAuditFromProject,
  type ProjectMutationInput,
  updateProject,
} from "@/lib/backend-server";
import type {
  AuditProjectActionState,
  ProjectActionState,
} from "./projects-state";

function toProjectUiError(error: unknown, fallback: string) {
  if (error instanceof BackendRequestError) {
    return error.message;
  }

  return fallback;
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readProjectInput(formData: FormData): ProjectMutationInput {
  return {
    name: readString(formData, "name"),
    description: readString(formData, "description") || null,
  };
}

function revalidateProjectPaths(projectSlug: string | null) {
  revalidatePath("/dashboard");
  if (projectSlug) {
    revalidatePath(`/dashboard/projects/${projectSlug}`);
  }
}

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  try {
    const project = await createProject(readProjectInput(formData));
    if (!project) {
      throw new Error("Project creation returned no payload.");
    }
    const attachJobId = readString(formData, "attachJobId");
    if (attachJobId) {
      await attachAuditToProject(project.slug, attachJobId);
    }
    revalidateProjectPaths(project.slug);
    return {
      ok: true,
      error: null,
      projectSlug: project.slug,
    };
  } catch (error) {
    return {
      ok: false,
      error: toProjectUiError(error, "We couldn't save this project right now."),
      projectSlug: null,
    };
  }
}

export async function updateProjectAction(
  _previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const projectSlug = readString(formData, "projectSlug");
  try {
    const project = await updateProject(projectSlug, readProjectInput(formData));
    if (!project) {
      throw new Error("Project update returned no payload.");
    }
    revalidateProjectPaths(project.slug);
    return {
      ok: true,
      error: null,
      projectSlug: project.slug,
    };
  } catch (error) {
    return {
      ok: false,
      error: toProjectUiError(error, "We couldn't update this project right now."),
      projectSlug: null,
    };
  }
}

export async function attachAuditToProjectAction(
  _previousState: AuditProjectActionState,
  formData: FormData
): Promise<AuditProjectActionState> {
  const projectSlug = readString(formData, "projectSlug");
  const jobId = readString(formData, "jobId");

  try {
    await attachAuditToProject(projectSlug, jobId);
    revalidateProjectPaths(projectSlug);
    return {
      ok: true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error: toProjectUiError(error, "We couldn't add this audit to the project right now."),
    };
  }
}

export async function detachAuditFromProjectAction(
  _previousState: AuditProjectActionState,
  formData: FormData
): Promise<AuditProjectActionState> {
  const projectSlug = readString(formData, "projectSlug");
  const jobId = readString(formData, "jobId");

  try {
    await detachAuditFromProject(projectSlug, jobId);
    revalidateProjectPaths(projectSlug);
    return {
      ok: true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error: toProjectUiError(error, "We couldn't delete this audit right now."),
    };
  }
}
