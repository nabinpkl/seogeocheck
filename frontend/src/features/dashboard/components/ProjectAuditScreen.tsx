"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, ChevronRight, Clock3, ExternalLink, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditLiveStreamPanel } from "@/features/audit/components/AuditLiveStreamPanel";
import { AuditProgressSidebar } from "@/features/audit/components/AuditProgressSidebar";
import { AuditReportDetail } from "@/features/audit/components/AuditReportDetail";
import { AuditStatusHeader } from "@/features/audit/components/AuditStatusHeader";
import {
  auditReportQueryKey,
  ReportPendingError,
} from "@/lib/audit-query";
import { useAuditStore } from "@/store/use-audit-store";
import type { AuditReport } from "@/types/audit";
import {
  buildAuditHeaderModel,
  buildAuditStreamRowModel,
  formatConnectionLabel,
  isIssueCheck,
  isPassedCheck,
} from "@/features/audit/lib/view-models";
import type { DashboardAuditSummary } from "../types/audits";
import type { DashboardProjectSummary, ProjectTrackedUrlSummary } from "../types/projects";

type ProjectAuditScreenProps = {
  project: DashboardProjectSummary;
  trackedUrl: ProjectTrackedUrlSummary;
  latestAudit: DashboardAuditSummary | null;
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

export function ProjectAuditScreen({
  project,
  trackedUrl,
  latestAudit,
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

  const isLiveForTrackedUrl = Boolean(jobId && targetUrl === trackedUrl.trackedUrl);

  React.useEffect(() => {
    if (isLiveForTrackedUrl && streamUrl && connectionStatus === "idle") {
      connectToStream();
    }
  }, [connectToStream, connectionStatus, isLiveForTrackedUrl, streamUrl]);

  const liveReportQuery = useQuery({
    queryKey: isLiveForTrackedUrl && jobId ? auditReportQueryKey(jobId) : ["project-audit-report", "idle"],
    enabled: Boolean(isLiveForTrackedUrl && jobId && reportUrl),
    queryFn: () => fetchAuditReport(reportUrl!),
    retry: (failureCount, error) =>
      error instanceof ReportPendingError && failureCount < 20,
    retryDelay: 750,
    staleTime: 0,
    initialData: initialReport ?? undefined,
  });

  React.useEffect(() => {
    if (liveReportQuery.data && status !== "VERIFIED" && isLiveForTrackedUrl) {
      markVerified();
    }
  }, [isLiveForTrackedUrl, liveReportQuery.data, markVerified, status]);

  const report = isLiveForTrackedUrl ? (liveReportQuery.data ?? initialReport) : initialReport;
  const hasAuditFailed = isLiveForTrackedUrl ? status === "FAILED" : latestAudit?.status === "FAILED";
  const pendingReport =
    isLiveForTrackedUrl &&
    (liveReportQuery.fetchStatus === "fetching" ||
      liveReportQuery.error instanceof ReportPendingError);
  const userFacingError =
    liveError ||
    (liveReportQuery.error instanceof Error &&
      !(liveReportQuery.error instanceof ReportPendingError)
      ? liveReportQuery.error.message
      : null);
  const headerModel = buildAuditHeaderModel({
    status: isLiveForTrackedUrl ? status : latestAudit?.status ?? "VERIFIED",
    isPending: false,
    targetUrl: trackedUrl.trackedUrl,
    placeholderUrl: trackedUrl.trackedUrl,
    hasAuditFailed,
    pendingReport,
    hasReport: Boolean(report),
    reportScore:
      typeof report?.summary?.score === "number"
        ? report.summary.score
        : trackedUrl.currentScore ?? 0,
    userFacingError,
  });

  const liveChecks = events.filter((event) => event.type === "check");
  const liveFindings = liveChecks.filter((event) => isIssueCheck(event.checkStatus));
  const livePassedChecks = liveChecks.filter((event) => isPassedCheck(event.checkStatus));
  const currentProgress =
    [...events].reverse().find((event) => typeof event.progress === "number")
      ?.progress ?? 0;
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
              <p className="flex items-center gap-2 text-sm text-slate-500">
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

      {isLiveForTrackedUrl && (!report || pendingReport || hasAuditFailed) ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
      ) : !isLiveForTrackedUrl ? (
        <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-8 text-sm leading-6 text-slate-600 shadow-sm">
          This page does not have a completed report yet. Start a new audit to generate a full page result here.
        </div>
      ) : null}
    </div>
  );
}
