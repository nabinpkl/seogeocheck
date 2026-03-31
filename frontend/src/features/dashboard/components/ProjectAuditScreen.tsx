"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AuditExperiencePanel } from "@/features/audit/components/AuditExperiencePanel";
import { AuditReportDetail } from "@/features/audit/components/AuditReportDetail";
import { useAuditExperience } from "@/features/audit/hooks/useAuditExperience";
import { cn } from "@/lib/utils";
import { useAuditStore } from "@/store/use-audit-store";
import type { AuditReport } from "@/types/audit";
import { startAuditAction } from "@/app/actions/start-audit";
import { initialAuditActionState } from "@/app/actions/start-audit-state";
import { buildProjectAuditHref } from "../lib/routes";
import type { DashboardAuditSummary } from "../types/audits";
import type { DashboardProjectSummary, ProjectTrackedUrlSummary } from "../types/projects";

type ProjectAuditScreenProps = {
  project: DashboardProjectSummary;
  trackedUrl: ProjectTrackedUrlSummary;
  audits: DashboardAuditSummary[];
  selectedAudit: DashboardAuditSummary | null;
  initialReport: AuditReport | null;
  autoStartUrl?: string | null;
};

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

function countHighIssues(report: AuditReport | null) {
  if (!report?.checks) {
    return 0;
  }

  return report.checks.filter(
    (check) => check.status === "issue" && check.severity === "high"
  ).length;
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
  autoStartUrl = null,
}: ProjectAuditScreenProps) {
  const router = useRouter();
  const refreshedJobIdsRef = React.useRef<Set<string>>(new Set());
  const autoStartedRef = React.useRef(false);
  const [startedAuditMeta, setStartedAuditMeta] = React.useState<{
    jobId: string;
    targetUrl: string;
    createdAt: string;
  } | null>(null);
  const [startState, startFormAction] = React.useActionState(
    startAuditAction,
    initialAuditActionState
  );
  const injectedAuditCreatedAtRef = React.useRef<Record<string, string>>({});
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
  const { primeAudit, connectToStream, markVerified } = useAuditStore(
    useShallow((state) => ({
      primeAudit: state.primeAudit,
      connectToStream: state.connectToStream,
      markVerified: state.markVerified,
    }))
  );

  React.useEffect(() => {
    if (!autoStartUrl || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    const formData = new FormData();
    formData.append("url", autoStartUrl);
    formData.append("projectSlug", project.slug);
    React.startTransition(() => {
      startFormAction(formData);
    });
  }, [autoStartUrl, project.slug, startFormAction]);

  React.useEffect(() => {
    if (
      !startState.ok ||
      !startState.jobId ||
      !startState.streamUrl ||
      !startState.reportUrl ||
      !startState.status
    ) {
      return;
    }

    primeAudit({
      jobId: startState.jobId,
      targetUrl: startState.targetUrl,
      streamUrl: startState.streamUrl,
      reportUrl: startState.reportUrl,
      status: startState.status === "QUEUED" ? "QUEUED" : "STREAMING",
    });
    connectToStream();
    setStartedAuditMeta({
      jobId: startState.jobId,
      targetUrl: startState.targetUrl,
      createdAt: new Date().toISOString(),
    });
    window.history.replaceState(
      null,
      "",
      buildProjectAuditHref(project.slug, trackedUrl.trackedUrl, startState.jobId)
    );
  }, [
    connectToStream,
    primeAudit,
    project.slug,
    startState.jobId,
    startState.ok,
    startState.reportUrl,
    startState.status,
    startState.streamUrl,
    startState.targetUrl,
    trackedUrl.trackedUrl,
  ]);

  const injectedLiveAudit = React.useMemo<DashboardAuditSummary | null>(() => {
    if (startedAuditMeta && jobId === startedAuditMeta.jobId) {
      return {
        jobId: startedAuditMeta.jobId,
        targetUrl: startedAuditMeta.targetUrl,
        status,
        createdAt: startedAuditMeta.createdAt,
        completedAt: null,
        score: null,
        projectSlug: project.slug,
        projectName: project.name,
        trackedUrl: trackedUrl.trackedUrl,
      };
    }

    if (!jobId || !targetUrl || targetUrl !== trackedUrl.trackedUrl) {
      return null;
    }

    if (audits.some((audit) => audit.jobId === jobId)) {
      return null;
    }

    if (!injectedAuditCreatedAtRef.current[jobId]) {
      injectedAuditCreatedAtRef.current[jobId] = new Date().toISOString();
    }

    return {
      jobId,
      targetUrl,
      status,
      createdAt: injectedAuditCreatedAtRef.current[jobId],
      completedAt: null,
      score: null,
      projectSlug: project.slug,
      projectName: project.name,
      trackedUrl: trackedUrl.trackedUrl,
    };
  }, [
    audits,
    jobId,
    project.name,
    project.slug,
    startedAuditMeta,
    status,
    targetUrl,
    trackedUrl.trackedUrl,
  ]);

  const baseAudits = React.useMemo(() => {
    if (!injectedLiveAudit) {
      return audits;
    }

    return [injectedLiveAudit, ...audits].filter(
      (audit, index, collection) =>
        collection.findIndex((candidate) => candidate.jobId === audit.jobId) === index
    );
  }, [audits, injectedLiveAudit]);

  const latestAudit = baseAudits[0] ?? null;
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

  const experience = useAuditExperience({
    reportQueryKeyId: selectedAudit?.jobId ?? null,
    status: isLiveForSelectedAudit ? status : selectedAudit?.status ?? "VERIFIED",
    displayTargetUrl: trackedUrl.trackedUrl,
    placeholderUrl: trackedUrl.trackedUrl,
    reportUrl,
    streamUrl,
    connectionStatus,
    events,
    liveError,
    isLiveSession: isLiveForSelectedAudit,
    initialReport,
    reportScoreFallback: selectedAudit?.score ?? trackedUrl.currentScore ?? 0,
    onConnectToStream: connectToStream,
    onMarkVerified: markVerified,
  });

  const report = experience.report;
  const hasAuditFailed = experience.hasAuditFailed;

  const effectiveSelectedAudit = React.useMemo(() => {
    if (!selectedAudit) {
      return null;
    }

    if (!isLiveForSelectedAudit) {
      return selectedAudit;
    }

    return {
      ...selectedAudit,
      status,
      score:
        typeof report?.summary?.score === "number"
          ? report.summary.score
          : selectedAudit.score,
      completedAt:
        status === "VERIFIED" && typeof report?.generatedAt === "string"
          ? report.generatedAt
          : selectedAudit.completedAt,
    };
  }, [isLiveForSelectedAudit, report, selectedAudit, status]);

  const effectiveAudits = React.useMemo(
    () =>
      baseAudits.map((audit) =>
        effectiveSelectedAudit && audit.jobId === effectiveSelectedAudit.jobId
          ? effectiveSelectedAudit
          : audit
      ),
    [baseAudits, effectiveSelectedAudit]
  );

  const effectiveLatestAudit = effectiveAudits[0] ?? null;
  const effectiveTrackedUrl = React.useMemo(() => {
    if (!isLiveForSelectedAudit || !selectedRunIsLatest) {
      return trackedUrl;
    }

    return {
      ...trackedUrl,
      latestAuditStatus: status,
      currentScore:
        typeof report?.summary?.score === "number"
          ? report.summary.score
          : trackedUrl.currentScore,
      currentCriticalIssueCount:
        report ? countHighIssues(report) : trackedUrl.currentCriticalIssueCount,
      latestVerifiedAt:
        status === "VERIFIED" && typeof report?.generatedAt === "string"
          ? report.generatedAt
          : trackedUrl.latestVerifiedAt,
      latestAuditAt:
        typeof report?.generatedAt === "string"
          ? report.generatedAt
          : trackedUrl.latestAuditAt,
    };
  }, [isLiveForSelectedAudit, report, selectedRunIsLatest, status, trackedUrl]);

  React.useEffect(() => {
    if (!isLiveForSelectedAudit || !selectedAudit || (!report && !hasAuditFailed)) {
      return;
    }

    if (refreshedJobIdsRef.current.has(selectedAudit.jobId)) {
      return;
    }

    refreshedJobIdsRef.current.add(selectedAudit.jobId);
    router.refresh();
  }, [hasAuditFailed, isLiveForSelectedAudit, report, router, selectedAudit]);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="transition hover:text-slate-900">
            Dashboard
          </Link>
          <ChevronRight className="size-4" />
          <Link
            href={`/dashboard?project=${encodeURIComponent(project.slug)}`}
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
              <Link href={`/dashboard?project=${encodeURIComponent(project.slug)}`}>
                <ArrowLeft className="size-4" />
                Back to dashboard
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
                Latest audit {formatTimestamp(effectiveLatestAudit?.completedAt ?? effectiveLatestAudit?.createdAt ?? effectiveTrackedUrl.latestAuditAt)}
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

      {!selectedRunIsLatest && effectiveLatestAudit ? (
        <Card className="border-amber-200/70 bg-amber-50/70 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-950">
                {latestAuditIsActive
                  ? "A newer audit is running for this page."
                  : "You are viewing an older audit for this page."}
              </p>
              <p className="text-sm text-slate-600">
                Latest audit updated {formatTimestamp(effectiveLatestAudit.completedAt ?? effectiveLatestAudit.createdAt)}.
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
                {formatStatus(effectiveSelectedAudit?.status)}
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
              {effectiveSelectedAudit ? (
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Audit ID {effectiveSelectedAudit.jobId}
                </span>
              ) : null}
              {effectiveSelectedAudit ? (
                <span className="text-sm text-slate-500">
                  {formatTimestamp(effectiveSelectedAudit.completedAt ?? effectiveSelectedAudit.createdAt)}
                </span>
              ) : null}
            </CardContent>
          </Card>

          <AuditExperiencePanel
            headerModel={experience.headerModel}
            showLivePanels={experience.showLivePanels}
            liveProgress={experience.liveProgress}
            liveStreamRows={experience.liveStreamRows}
            reportContent={report ? <AuditReportDetail report={report} /> : null}
            emptyContent={
              <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-8 text-sm leading-6 text-slate-600 shadow-sm">
                {selectedAudit
                  ? "This audit run does not have a completed result yet. Choose another run from the right or start a new audit."
                  : "This page does not have an audit result yet. Start a new audit to generate a full page result here."}
              </div>
            }
          />
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
                    {typeof effectiveTrackedUrl.currentScore === "number" ? effectiveTrackedUrl.currentScore : "Not scored yet"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Priority Issues
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {effectiveTrackedUrl.currentCriticalIssueCount}
                  </p>
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <p>Latest status: <span className="font-semibold text-slate-900">{formatStatus(effectiveTrackedUrl.latestAuditStatus)}</span></p>
                <p>Saved audits: <span className="font-semibold text-slate-900">{effectiveAudits.length}</span></p>
                <p>Latest completed audit: <span className="font-semibold text-slate-900">{formatTimestamp(effectiveTrackedUrl.latestVerifiedAt ?? effectiveTrackedUrl.latestAuditAt)}</span></p>
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
              {effectiveAudits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                  No audit runs are saved for this page yet.
                </div>
              ) : (
                effectiveAudits.map((audit, index) => {
                  const isSelected = effectiveSelectedAudit?.jobId === audit.jobId;
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
