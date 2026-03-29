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
  }>;
};

export default async function ProjectAuditPage({ params, searchParams }: ProjectAuditPageProps) {
  const { slug, trackedUrl: encodedTrackedUrl } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedRunId = typeof resolvedSearchParams.run === "string" ? resolvedSearchParams.run : null;
  const trackedUrl = decodeURIComponent(encodedTrackedUrl);

  const [project, trackedUrls, audits] = await Promise.all([
    getAccountProject(slug),
    getAccountProjectUrls(slug),
    getAccountProjectAudits(slug, trackedUrl),
  ]);

  if (!project) {
    notFound();
  }

  const trackedUrlSummary = trackedUrls.find((item) => item.trackedUrl === trackedUrl);
  if (!trackedUrlSummary) {
    notFound();
  }

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
          trackedUrl={trackedUrlSummary}
          audits={audits}
          selectedAudit={selectedAudit}
          initialReport={initialReport}
        />
      </PageShell>
    </div>
  );
}
