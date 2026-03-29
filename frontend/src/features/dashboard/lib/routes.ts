export function buildProjectAuditHref(projectSlug: string, trackedUrl: string, runId?: string | null) {
  const basePath = `/dashboard/projects/${encodeURIComponent(projectSlug)}/audit/${encodeURIComponent(trackedUrl)}`;
  if (!runId) {
    return basePath;
  }

  return `${basePath}?run=${encodeURIComponent(runId)}`;
}
