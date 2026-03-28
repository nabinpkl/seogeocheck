"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, Link2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardAuditSummary } from "../types/audits";
import type { DashboardProjectSummary, ProjectTrackedUrlSummary } from "../types/projects";
import { buildProjectAuditHref } from "../lib/routes";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { DetachAuditButton } from "./DetachAuditButton";

type ProjectDetailScreenProps = {
  project: DashboardProjectSummary;
  trackedUrls: ProjectTrackedUrlSummary[];
  audits: DashboardAuditSummary[];
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No completed audit yet";
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

function formatStatus(status: string | null) {
  if (!status) {
    return "No active audit";
  }
  switch (status) {
    case "VERIFIED":
      return "Ready";
    case "FAILED":
      return "Needs attention";
    case "STREAMING":
      return "Running";
    case "COMPLETE":
      return "Finishing";
    case "QUEUED":
      return "Starting";
    default:
      return status;
  }
}

export function ProjectDetailScreen({
  project,
  trackedUrls,
  audits,
}: ProjectDetailScreenProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="h-9 rounded-full px-3 text-sm font-semibold text-slate-600">
            <Link href={`/dashboard?project=${encodeURIComponent(project.slug)}`}>
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Project Overview
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{project.name}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {project.description || "Use this project to keep related pages together and monitor performance in one place."}
            </p>
          </div>
          {project.description ? null : (
            <Badge className="w-fit border border-slate-200 bg-white text-slate-700">
              {project.trackedUrlCount === 0 ? "Ready for the first page" : `${project.trackedUrlCount} pages in this project`}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <ProjectFormDialog mode="edit" project={project} triggerLabel="Edit Project" />
          <Button asChild className="rounded-full px-5">
            <Link href={`/dashboard?project=${encodeURIComponent(project.slug)}#audit-section`}>
              <Sparkles className="size-4" />
              Start Audit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project Score</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{project.projectScore ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Pages</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{project.trackedUrlCount}</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Priority Issues</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{project.criticalIssueCount}</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Score Trend</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {project.scoreTrend ? `${project.scoreTrend.netScoreDelta > 0 ? "+" : ""}${project.scoreTrend.netScoreDelta}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Pages in This Project</CardTitle>
            <CardDescription>Each page appears once here, and every new audit builds on that page&apos;s history.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            {trackedUrls.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                Start the first audit in this project to add your first page.
              </div>
            ) : (
              trackedUrls.map((trackedUrl) => (
                <Link
                  key={trackedUrl.id}
                  href={buildProjectAuditHref(project.slug, trackedUrl.trackedUrl)}
                  className="rounded-2xl border border-slate-200 p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{trackedUrl.trackedUrl}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Last completed audit {formatTimestamp(trackedUrl.latestVerifiedAt)}
                      </p>
                    </div>
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      {trackedUrl.currentScore ?? "—"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{trackedUrl.auditCount} audits</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {trackedUrl.currentCriticalIssueCount} priority issues
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatStatus(trackedUrl.latestAuditStatus)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Top Priorities</CardTitle>
            <CardDescription>Recurring high-priority problems found across the latest completed audit for each page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            {project.topIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                No recurring high-priority issues yet.
              </div>
            ) : (
              project.topIssues.map((issue) => (
                <div key={issue.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{issue.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{issue.affectedUrlCount} pages affected</p>
                    </div>
                    <ShieldAlert className="size-4 text-amber-600" />
                  </div>
                  {issue.exampleInstruction ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{issue.exampleInstruction}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-white/95 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Audit History</CardTitle>
          <CardDescription>All audits saved in this project.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-4">
          {audits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
              No audits have been saved in this project yet.
            </div>
          ) : (
            audits.map((audit) => (
              <div
                key={audit.jobId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={
                        audit.projectSlug && audit.trackedUrl
                          ? buildProjectAuditHref(audit.projectSlug, audit.trackedUrl)
                          : `/dashboard/audits/${audit.jobId}`
                      }
                      className="truncate text-sm font-semibold text-slate-950 transition hover:text-primary"
                    >
                      {audit.targetUrl}
                    </Link>
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      {audit.score ?? "—"}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 className="size-3.5" />
                    {formatTimestamp(audit.completedAt ?? audit.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild variant="ghost" className="h-9 rounded-full px-4 text-xs font-semibold">
                    <Link
                      href={
                        audit.projectSlug && audit.trackedUrl
                          ? buildProjectAuditHref(audit.projectSlug, audit.trackedUrl)
                          : `/dashboard/audits/${audit.jobId}`
                      }
                    >
                      <Link2 className="size-4" />
                      View report
                    </Link>
                  </Button>
                  {audit.projectSlug ? (
                    <DetachAuditButton projectSlug={audit.projectSlug} jobId={audit.jobId} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
