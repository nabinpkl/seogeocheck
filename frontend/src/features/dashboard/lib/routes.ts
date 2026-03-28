export function buildProjectAuditHref(projectSlug: string, trackedUrl: string) {
  return `/dashboard/projects/${encodeURIComponent(projectSlug)}/audit/${encodeURIComponent(trackedUrl)}`;
}
