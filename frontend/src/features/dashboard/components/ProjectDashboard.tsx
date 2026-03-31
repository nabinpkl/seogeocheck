"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  FolderTree,
  Globe,
} from "lucide-react";
import { AuditSection } from "@/features/audit/AuditSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import type { DashboardProjectSummary, ProjectTrackedUrlSummary } from "../types/projects";
import { buildProjectAuditHref } from "../lib/routes";
import { ProjectFormDialog } from "./ProjectFormDialog";

type ProjectDashboardProps = {
  viewer: AuthUser | null;
  projects: DashboardProjectSummary[];
  trackedUrls: ProjectTrackedUrlSummary[];
  selectedProjectSlug: string | null;
};

function isLiveStatus(status: string | null) {
  return status === "STREAMING" || status === "COMPLETE" || status === "QUEUED";
}

function statusTone(status?: string | null) {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "STREAMING":
    case "COMPLETE":
    case "QUEUED":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "In progress";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDashboardHref(projectSlug: string | null) {
  if (!projectSlug) {
    return "/dashboard";
  }
  return `/dashboard?project=${encodeURIComponent(projectSlug)}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function ProjectDashboard({
  viewer,
  projects,
  trackedUrls,
  selectedProjectSlug,
}: ProjectDashboardProps) {
  const hasProjects = projects.length > 0;

  const selectedProject = React.useMemo(
    () => projects.find((project) => project.slug === selectedProjectSlug) ?? null,
    [projects, selectedProjectSlug]
  );

  const trackedUrlCount = selectedProject?.trackedUrlCount ?? 0;
  const activeAuditCount = selectedProject?.activeAuditCount ?? 0;
  const projectScore = selectedProject?.projectScore ?? null;

  const projectMetricHeadline =
    trackedUrlCount > 0 ? String(trackedUrlCount) : "No pages yet";
  const projectMetricDescription =
    trackedUrlCount > 0
      ? `page in this project`
      : "Save an audit into this project to start building its page list.";

  const projectScoreHeadline = typeof projectScore === "number" ? String(projectScore) : "No score yet";
  const projectScoreDescription =
    selectedProject?.verifiedUrlCount
      ? `Based on latest audit runs for ${pluralize(selectedProject.verifiedUrlCount, "page")}`
      : "Complete the first audit in this project to generate a score.";

  const activeMetricDescription =
    selectedProject && activeAuditCount > 0
      ? selectedProject
        ? `${pluralize(activeAuditCount, "audit")} currently running in this project`
        : `${pluralize(activeAuditCount, "audit")} currently running`
      : selectedProject
        ? "No active audits in this project right now."
        : "No active audits right now.";

  return (
    <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg text-slate-950">Projects</CardTitle>
            <CardDescription>
              {hasProjects
                ? "Choose a project to focus the dashboard on one body of work."
                : "Create your first project to organize related pages and track progress in one place."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <ProjectFormDialog mode="create" triggerLabel="Create Project" triggerClassName="w-full rounded-xl" />

            {!hasProjects ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Start with one project</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Create a project, then add sites and pages to organize your audits.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={buildDashboardHref(project.slug)}
                  className={cn(
                    "block rounded-2xl border px-4 py-3 transition-all",
                    project.slug === selectedProjectSlug
                      ? "border-primary/30 bg-primary/5"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">{project.name}</p>
                        {project.isDefault ? (
                          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                            Default
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.trackedUrlCount} pages
                      </p>
                    </div>
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      {project.projectScore ?? "New"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {pluralize(project.auditCount, "audit")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-10">
        {hasProjects && selectedProject ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-white/80 bg-white/95 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {selectedProject ? "Pages" : "Projects"}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                    {projectMetricHeadline}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {projectMetricDescription}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <FolderTree className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Project Score
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                    {projectScoreHeadline}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {projectScoreDescription}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <Globe className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Active Audits
                  </p>
                  {activeAuditCount > 0 ? (
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                      {activeAuditCount}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "font-medium text-slate-500",
                      activeAuditCount > 0 ? "mt-1 text-xs" : "mt-2 text-sm leading-6"
                    )}
                  >
                    {activeMetricDescription}
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <Activity className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-200/80 bg-emerald-50/70 shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700/70">
                  Step 1
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Create your first project
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Organize a domain, section, or single page before you start building history.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95 shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Step 2
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Run a first audit
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Audit any site or page below. Once you save it into a project, you can track changes over time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95 shadow-sm">
              <CardContent className="p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  What you&apos;ll unlock
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Clear project reporting
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  See page-level coverage, recurring issues, and progress once your first project is in place.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div id="audit-section">
          <AuditSection variant="dashboard" viewer={viewer} projectSlug={selectedProjectSlug} />
        </div>

        {selectedProject ? (
          <div className="space-y-4 mt-10">
            <div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Pages & Sites
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Open page/sites below to see its latest result and previous audit runs.
              </p>
            </div>

            {trackedUrls.length === 0 ? (
              <Card className="border-dashed border-slate-200 bg-white/90">
                <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
                    <Globe className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-900">No pages in this project yet</CardTitle>
                    <p className="max-w-lg text-sm leading-6 text-slate-600">
                      Run an audit above or add one from your saved audits to start this project&apos;s page list.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {trackedUrls.map((trackedUrl) => (
                  <Link
                    key={trackedUrl.id}
                    href={buildProjectAuditHref(selectedProject.slug, trackedUrl.trackedUrl)}
                    className="rounded-2xl border border-white/80 bg-white/95 p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {isLiveStatus(trackedUrl.latestAuditStatus) ? (
                            <Badge className={cn("border font-semibold", statusTone(trackedUrl.latestAuditStatus ?? "QUEUED"))}>
                              <span className="mr-1.5 inline-block size-2 rounded-full bg-current" />
                              Live
                            </Badge>
                          ) : null}
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {pluralize(trackedUrl.auditCount, "audit")}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-slate-950">{trackedUrl.trackedUrl}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Updated {formatTimestamp(trackedUrl.latestVerifiedAt ?? trackedUrl.latestAuditAt)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Latest Score
                          </p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                            {typeof trackedUrl.currentScore === "number" ? trackedUrl.currentScore : "Not scored yet"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Priority Issues
                          </p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                            {trackedUrl.currentCriticalIssueCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
