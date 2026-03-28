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
};

export default async function ProjectAuditPage({ params }: ProjectAuditPageProps) {
  const { slug, trackedUrl: encodedTrackedUrl } = await params;
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

  const latestAudit = audits[0] ?? null;
  const latestReportedAudit = audits.find((audit) => typeof audit.score === "number") ?? null;
  const initialReport = latestReportedAudit
    ? await getOwnedAuditReport(latestReportedAudit.jobId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <ProjectAuditScreen
          project={project}
          trackedUrl={trackedUrlSummary}
          latestAudit={latestAudit}
          initialReport={initialReport}
        />
      </PageShell>
    </div>
  );
}
