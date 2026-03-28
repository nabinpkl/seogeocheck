import * as React from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ProjectDetailScreen } from "@/features/dashboard/components/ProjectDetailScreen";
import {
  getAccountProject,
  getAccountProjectAudits,
  getAccountProjectUrls,
} from "@/lib/backend-server";

type ProjectDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const [project, trackedUrls, audits] = await Promise.all([
    getAccountProject(slug),
    getAccountProjectUrls(slug),
    getAccountProjectAudits(slug),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <ProjectDetailScreen project={project} trackedUrls={trackedUrls} audits={audits} />
      </PageShell>
    </div>
  );
}
