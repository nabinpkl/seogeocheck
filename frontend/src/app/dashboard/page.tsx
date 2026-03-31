import * as React from "react";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ProjectDashboard } from "@/features/dashboard/components/ProjectDashboard";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { getAccountProjects, getAccountProjectUrls } from "@/lib/backend-server";

type DashboardPageProps = {
  searchParams?: Promise<{
    project?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const viewer = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedProjectSlug = typeof resolvedSearchParams.project === "string"
    ? resolvedSearchParams.project
    : null;
  const projects = await getAccountProjects();
  const selectedProjectSlug = requestedProjectSlug && projects.some((project) => project.slug === requestedProjectSlug)
    ? requestedProjectSlug
    : null;

  if (projects.length > 0 && !selectedProjectSlug) {
    redirect(`/dashboard?project=${encodeURIComponent(projects[0].slug)}`);
  }

  const trackedUrls = selectedProjectSlug ? await getAccountProjectUrls(selectedProjectSlug) : [];

  return (
    <div className="min-h-screen pb-24 bg-slate-50/50">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="mb-10">
          <p className="text-slate-500 font-medium max-w-2xl text-lg">
            Organize each project, keep its sites and pages together, and run fresh audits whenever you need them.
          </p>
        </div>

        <ProjectDashboard
          viewer={viewer}
          projects={projects}
          trackedUrls={trackedUrls}
          selectedProjectSlug={selectedProjectSlug}
        />
      </PageShell>
    </div>
  );
}
