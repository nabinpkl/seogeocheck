"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  ExternalLink,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLiveStreamPanel } from "@/features/audit/components/AuditLiveStreamPanel";
import { AuditProgressSidebar } from "@/features/audit/components/AuditProgressSidebar";
import { AuditReportDetail } from "@/features/audit/components/AuditReportDetail";
import { AuditStatusHeader } from "@/features/audit/components/AuditStatusHeader";
import { auditReportQueryKey, ReportPendingError } from "@/lib/audit-query";
import { cn } from "@/lib/utils";
import { useAuditStore } from "@/store/use-audit-store";
import type { AuditReport } from "@/types/audit";
import {
  buildAuditHeaderModel,
  buildAuditStreamRowModel,
  formatConnectionLabel,
  isIssueCheck,
  isPassedCheck,
} from "@/features/audit/lib/view-models";
import { buildProjectAuditHref } from "../lib/routes";
import type { DashboardAuditSummary } from "../types/audits";
import type { DashboardProjectSummary, ProjectTrackedUrlSummary } from "../types/projects";

type ProjectAuditScreenProps = {
  project: DashboardProjectSummary;
  trackedUrl: ProjectTrackedUrlSummary;
  audits: DashboardAuditSummary[];
  selectedAudit: DashboardAuditSummary | null;
  initialReport: AuditReport | null;
};

async function fetchAuditReport(reportUrl: string): Promise<AuditReport> {
  const response = await fetch(reportUrl, {
    cache: "no-store",
  });

  if (response.status === 202) {
    throw new ReportPendingError();
  }

  if (!response.ok) {
    throw new Error("We couldn't load your audit results.");
  }

  return (await response.json()) as AuditReport;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Unknown";
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

function formatStatus(status?: string | null) {
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
      return "Waiting";
  }
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

function isActiveAuditStatus(status?: string | null) {
  return status === "QUEUED" || status === "STREAMING" || status === "COMPLETE";
}

function buildRunHref(projectSlug: string, trackedUrl: string, audit: DashboardAuditSummary, latestAudit: DashboardAuditSummary | null) {
  return buildProjectAuditHref(
    projectSlug,
    trackedUrl,
    latestAudit && audit.jobId === latestAudit.jobId ? null : audit.jobId
  );
}

export function ProjectAuditScreen({
  project,
  trackedUrl,
  audits,
  selectedAudit: selectedAuditProp,
  initialReport,
}: ProjectAuditScreenProps) {
  const {
    jobId,
    targetUrl,
    reportUrl,
    streamUrl,
    status,
    connectionStatus,
    events,
    liveError,
  } = useAuditStore(
    useShallow((state) => ({
      jobId: state.jobId,
      targetUrl: state.targetUrl,
      reportUrl: state.reportUrl,
      streamUrl: state.streamUrl,
      status: state.status,
      connectionStatus: state.connectionStatus,
      events: state.events,
      liveError: state.error,
    }))
  );
  const { connectToStream, markVerified } = useAuditStore(
    useShallow((state) => ({
      connectToStream: state.connectToStream,
      markVerified: state.markVerified,
    }))
  );

  const latestAudit = audits[0] ?? null;
  const selectedAudit = selectedAuditProp ?? latestAudit;
  const selectedRunIsLatest = Boolean(
    latestAudit && selectedAudit && latestAudit.jobId === selectedAudit.jobId
  );
  const latestAuditIsActive = isActiveAuditStatus(latestAudit?.status);
  const isLiveForSelectedAudit = Boolean(
    selectedRunIsLatest &&
      selectedAudit &&
      jobId === selectedAudit.jobId &&
      targetUrl === trackedUrl.trackedUrl
  );

  React.useEffect(() => {
    if (isLiveForSelectedAudit && streamUrl && connectionStatus === "idle") {
      connectToStream();
    }
  }, [connectToStream, connectionStatus, isLiveForSelectedAudit, streamUrl]);

  const liveReportQuery = useQuery({
    queryKey: isLiveForSelectedAudit && selectedAudit ? auditReportQueryKey(selectedAudit.jobId) : ["project-audit-report", "idle"],
    enabled: Boolean(isLiveForSelectedAudit && selectedAudit && reportUrl),
    queryFn: () => fetchAuditReport(reportUrl!),
    retry: (failureCount, error) => error instanceof ReportPendingError && failureCount < 20,
    retryDelay: 750,
    staleTime: 0,
    initialData: isLiveForSelectedAudit ? (initialReport ?? undefined) : undefined,
  });

  React.useEffect(() => {
    if (liveReportQuery.data && status !== "VERIFIED" && isLiveForSelectedAudit) {
      markVerified();
    }
  }, [isLiveForSelectedAudit, liveReportQuery.data, markVerified, status]);

  const report = isLiveForSelectedAudit ? (liveReportQuery.data ?? initialReport) : initialReport;
  const hasAuditFailed = isLiveForSelectedAudit ? status === "FAILED" : selectedAudit?.status === "FAILED";
  const pendingReport =
    isLiveForSelectedAudit &&
    (liveReportQuery.fetchStatus === "fetching" || liveReportQuery.error instanceof ReportPendingError);
  const userFacingError =
    liveError ||
    (liveReportQuery.error instanceof Error && !(liveReportQuery.error instanceof ReportPendingError)
      ? liveReportQuery.error.message
      : null);
  const headerModel = buildAuditHeaderModel({
    status: isLiveForSelectedAudit ? status : selectedAudit?.status ?? "VERIFIED",
    isPending: false,
    targetUrl: trackedUrl.trackedUrl,
    placeholderUrl: trackedUrl.trackedUrl,
    hasAuditFailed,
    pendingReport,
    hasReport: Boolean(report),
    reportScore:
      typeof report?.summary?.score === "number"
        ? report.summary.score
        : selectedAudit?.score ?? trackedUrl.currentScore ?? 0,
    userFacingError,
  });

  const liveChecks = events.filter((event) => event.type === "check");
  const liveFindings = liveChecks.filter((event) => isIssueCheck(event.checkStatus));
  const livePassedChecks = liveChecks.filter((event) => isPassedCheck(event.checkStatus));
  const currentProgress =
    [...events].reverse().find((event) => typeof event.progress === "number")?.progress ?? 0;
  const progressValue = hasAuditFailed ? 100 : report ? 100 : currentProgress;
  const progressLabel = hasAuditFailed
    ? "Failed"
    : report
      ? "Ready"
      : currentProgress === 0
        ? "Starting..."
        : `${currentProgress}%`;
  const currentStepMessage = hasAuditFailed
    ? userFacingError ?? "We couldn't finish this audit."
    : pendingReport
      ? "Putting the final touches on this audit"
      : report
        ? "This audit is ready"
        : "Checking this page";
  const operationState = hasAuditFailed
    ? "failed"
    : pendingReport
      ? "pending"
      : report
        ? "ready"
        : "active";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="transition hover:text-slate-900">
            Dashboard
          </Link>
          <ChevronRight className="size-4" />
          <Link
            href={`/dashboard/projects/${encodeURIComponent(project.slug)}`}
            className="transition hover:text-slate-900"
          >
            {project.name}
          </Link>
          <ChevronRight className="size-4" />
          <span className="truncate text-slate-900">{trackedUrl.trackedUrl}</span>
        </nav>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="ghost" className="h-9 rounded-full px-3 text-sm font-semibold text-slate-600">
              <Link href={`/dashboard/projects/${encodeURIComponent(project.slug)}`}>
                <ArrowLeft className="size-4" />
                Back to project
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Project Audit
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {trackedUrl.trackedUrl}
              </h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Clock3 className="size-4" />
                Latest audit {formatTimestamp(latestAudit?.completedAt ?? latestAudit?.createdAt ?? trackedUrl.latestAuditAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="h-11 rounded-full px-5 text-sm font-semibold">
              <a href={trackedUrl.trackedUrl} target="_blank" rel="noreferrer">
                Visit audited page
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button asChild className="h-11 rounded-full px-5 text-sm font-semibold">
              <Link href={`/dashboard?project=${encodeURIComponent(project.slug)}#audit-section`}>
                <FolderTree className="size-4" />
                Start another audit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!selectedRunIsLatest && latestAudit ? (
        <Card className="border-amber-200/70 bg-amber-50/70 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-950">
                {latestAuditIsActive
                  ? "A newer audit is running for this page."
                  : "You are viewing an older audit for this page."}
              </p>
              <p className="text-sm text-slate-600">
                Latest audit updated {formatTimestamp(latestAudit.completedAt ?? latestAudit.createdAt)}.
              </p>
            </div>
            <Button asChild className="h-10 rounded-full px-4 text-sm font-semibold">
              <Link href={buildProjectAuditHref(project.slug, trackedUrl.trackedUrl)}>
                View latest audit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95 shadow-sm">
            <CardContent className="flex flex-wrap items-center gap-3 p-5">
              <Badge className={cn("border font-semibold", statusTone(selectedAudit?.status))}>
                {formatStatus(selectedAudit?.status)}
              </Badge>
              {selectedRunIsLatest ? (
                <Badge className="border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
                  Latest audit
                </Badge>
              ) : (
                <Badge className="border border-slate-200 bg-slate-100 font-semibold text-slate-700">
                  Historical run
                </Badge>
              )}
              {selectedAudit ? (
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Audit ID {selectedAudit.jobId}
                </span>
              ) : null}
              {selectedAudit ? (
                <span className="text-sm text-slate-500">
                  {formatTimestamp(selectedAudit.completedAt ?? selectedAudit.createdAt)}
                </span>
              ) : null}
            </CardContent>
          </Card>

          {isLiveForSelectedAudit && (!report || pendingReport || hasAuditFailed) ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <AuditStatusHeader model={headerModel} />
                <AuditLiveStreamPanel rows={events.map(buildAuditStreamRowModel)} />
              </div>

              <AuditProgressSidebar
                connectionLabel={formatConnectionLabel(connectionStatus, status)}
                hasAuditFailed={hasAuditFailed}
                targetUrlLabel={trackedUrl.trackedUrl}
                gapsCount={liveFindings.length}
                signalsCount={livePassedChecks.length}
                progressValue={progressValue}
                progressLabel={progressLabel}
                progressBarClassName={hasAuditFailed ? "bg-rose-500" : "bg-primary"}
                currentStepMessage={currentStepMessage}
                operationState={operationState}
              />
            </div>
          ) : null}

          {report ? (
            <AuditReportDetail report={report} />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-8 text-sm leading-6 text-slate-600 shadow-sm">
              {selectedAudit
                ? "This audit run does not have a completed result yet. Choose another run from the right or start a new audit."
                : "This page does not have an audit result yet. Start a new audit to generate a full page result here."}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-white/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg text-slate-950">Page Summary</CardTitle>
              <CardDescription>
                Latest project view for this page across its saved audits.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Latest Score
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {typeof trackedUrl.currentScore === "number" ? trackedUrl.currentScore : "Not scored yet"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Priority Issues
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {trackedUrl.currentCriticalIssueCount}
                  </p>
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <p>Latest status: <span className="font-semibold text-slate-900">{formatStatus(trackedUrl.latestAuditStatus)}</span></p>
                <p>Saved audits: <span className="font-semibold text-slate-900">{audits.length}</span></p>
                <p>Latest completed audit: <span className="font-semibold text-slate-900">{formatTimestamp(trackedUrl.latestVerifiedAt ?? trackedUrl.latestAuditAt)}</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg text-slate-950">Audit History</CardTitle>
              <CardDescription>
                Switch the main result view to any audit run for this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              {audits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                  No audit runs are saved for this page yet.
                </div>
              ) : (
                audits.map((audit, index) => {
                  const isSelected = selectedAudit?.jobId === audit.jobId;
                  const isLatest = index === 0;

                  return (
                    <Link
                      key={audit.jobId}
                      href={buildRunHref(project.slug, trackedUrl.trackedUrl, audit, latestAudit)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 transition-all",
                        isSelected
                          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border font-semibold", statusTone(audit.status))}>
                              {formatStatus(audit.status)}
                            </Badge>
                            {isLatest ? (
                              <Badge className="border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
                                Latest
                              </Badge>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-950">
                              {typeof audit.score === "number" ? `Score ${audit.score}` : "Result pending"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatTimestamp(audit.completedAt ?? audit.createdAt)}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {audit.jobId}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={cn("mt-1 size-4", isSelected ? "text-primary" : "text-slate-400")} />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
