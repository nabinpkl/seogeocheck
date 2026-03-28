import * as React from "react";
import { PageShell } from "@/components/ui/page-shell";
import { ProjectDashboard } from "@/features/dashboard/components/ProjectDashboard";
import { getAccountAudits, getAccountProjects } from "@/lib/backend-server";

type DashboardPageProps = {
  searchParams?: Promise<{
    project?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedProjectSlug = typeof resolvedSearchParams.project === "string"
    ? resolvedSearchParams.project
    : null;
  const [projects, audits] = await Promise.all([
    getAccountProjects(),
    getAccountAudits(selectedProjectSlug),
  ]);

  return (
    <div className="min-h-screen pb-24 bg-slate-50/50">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="mb-10">
          <p className="text-slate-500 font-medium max-w-2xl text-lg">
            Organize each project, keep its sites and pages together, and run fresh audits whenever you need them.
          </p>
        </div>

        <ProjectDashboard
          projects={projects}
          audits={audits}
          selectedProjectSlug={selectedProjectSlug}
        />
      </PageShell>
    </div>
  );
}
