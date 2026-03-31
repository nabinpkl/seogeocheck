import * as React from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ProjectAuditScreen } from "@/features/dashboard/components/ProjectAuditScreen";
import {
  getAccountProject,
  getAccountProjectAudits,
  getAccountProjectUrls,
  getOwnedAuditReport,
} from "@/lib/backend-server";

type ProjectAuditPageProps = {
  params: Promise<{
    slug: string;
    trackedUrl: string;
  }>;
  searchParams?: Promise<{
    run?: string;
    start?: string;
    url?: string;
  }>;
};

function buildPendingTrackedUrlSummary(trackedUrl: string) {
  try {
    const parsed = new URL(trackedUrl);
    return {
      id: `pending:${trackedUrl}`,
      trackedUrl,
      normalizedUrl: trackedUrl,
      normalizedHost: parsed.hostname,
      normalizedPath: parsed.pathname || "/",
      auditCount: 0,
      latestAuditAt: null,
      latestAuditStatus: null,
      latestVerifiedAt: null,
      currentScore: null,
      currentCriticalIssueCount: 0,
    };
  } catch {
    return {
      id: `pending:${trackedUrl}`,
      trackedUrl,
      normalizedUrl: trackedUrl,
      normalizedHost: "",
      normalizedPath: "/",
      auditCount: 0,
      latestAuditAt: null,
      latestAuditStatus: null,
      latestVerifiedAt: null,
      currentScore: null,
      currentCriticalIssueCount: 0,
    };
  }
}

export default async function ProjectAuditPage({ params, searchParams }: ProjectAuditPageProps) {
  const { slug, trackedUrl: encodedTrackedUrl } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedRunId = typeof resolvedSearchParams.run === "string" ? resolvedSearchParams.run : null;
  const autoStartRequested = resolvedSearchParams.start === "1";
  const autoStartUrl =
    autoStartRequested && typeof resolvedSearchParams.url === "string" && resolvedSearchParams.url.trim().length > 0
      ? resolvedSearchParams.url.trim()
      : null;
  const trackedUrl = decodeURIComponent(encodedTrackedUrl);

  const project = await getAccountProject(slug);

  if (!project) {
    notFound();
  }

  const [trackedUrls, audits] = autoStartUrl
    ? [[], []]
    : await Promise.all([
        getAccountProjectUrls(slug),
        getAccountProjectAudits(slug, trackedUrl),
      ]);

  const trackedUrlSummary = trackedUrls.find((item) => item.trackedUrl === trackedUrl);
  if (!trackedUrlSummary && !autoStartUrl) {
    notFound();
  }
  const effectiveTrackedUrlSummary = trackedUrlSummary ?? buildPendingTrackedUrlSummary(trackedUrl);

  const selectedAudit =
    (requestedRunId ? audits.find((audit) => audit.jobId === requestedRunId) : null) ??
    audits[0] ??
    null;
  const initialReport = selectedAudit
    ? await getOwnedAuditReport(selectedAudit.jobId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <ProjectAuditScreen
          project={project}
          trackedUrl={effectiveTrackedUrlSummary}
          audits={audits}
          selectedAudit={selectedAudit}
          initialReport={initialReport}
          autoStartUrl={autoStartUrl}
        />
      </PageShell>
    </div>
  );
}
