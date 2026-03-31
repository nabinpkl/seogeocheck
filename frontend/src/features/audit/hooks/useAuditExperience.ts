"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { auditReportQueryKey, ReportPendingError } from "@/lib/audit-query";
import type { AuditReport, AuditStreamEvent } from "@/types/audit";
import {
  buildAuditHeaderModel,
  buildAuditStreamRowModel,
  isIssueCheck,
  isPassedCheck,
} from "../lib/view-models";

const LIVE_PHASE_LABELS: Record<string, string> = {
  source_capture_complete: "Scanning page",
  preflight_complete: "Crawling and collecting signals",
  sitewide_discovery_complete: "Crawling and collecting signals",
  sitewide_sampling_complete: "Crawling and collecting signals",
  rendered_capture_complete: "Comparing rendered and source content",
  rendered_capture_unavailable: "Comparing rendered and source content",
  finalizing_report: "Finalizing report",
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

function buildLivePhase(args: {
  events: AuditStreamEvent[];
  hasAuditFailed: boolean;
  isPending: boolean;
  pendingReport: boolean;
  status: string;
  liveChecksCount: number;
  userFacingError: string | null;
}) {
  const { events, hasAuditFailed, isPending, pendingReport, status, liveChecksCount, userFacingError } =
    args;

  if (hasAuditFailed) {
    return {
      phaseLabel: "Audit needs attention",
      phaseDetail: userFacingError ?? "We couldn't finish reviewing this page.",
    };
  }

  if (pendingReport || status === "COMPLETE") {
    return {
      phaseLabel: "Finalizing report",
      phaseDetail: "Preparing the signed report and locking in your final results.",
    };
  }

  if (isPending || status === "QUEUED") {
    return {
      phaseLabel: "Starting audit",
      phaseDetail: "Creating your audit session and getting the first checks ready.",
    };
  }

  const latestStageEvent = [...events]
    .reverse()
    .find((event) => typeof event.stage === "string" && event.stage.length > 0);

  if (latestStageEvent?.stage === "finalizing_report") {
    return {
      phaseLabel: LIVE_PHASE_LABELS[latestStageEvent.stage],
      phaseDetail:
        typeof latestStageEvent.message === "string" && latestStageEvent.message.trim().length > 0
          ? latestStageEvent.message
          : "Preparing the signed report and locking in your final results.",
    };
  }

  if (liveChecksCount > 0) {
    return {
      phaseLabel: "Calculating score",
      phaseDetail:
        liveChecksCount === 1
          ? "We have the first scored signal and are updating the live estimate."
          : `We have ${liveChecksCount} scored signals and are updating the live estimate.`,
    };
  }

  if (latestStageEvent?.stage) {
    return {
      phaseLabel: LIVE_PHASE_LABELS[latestStageEvent.stage] ?? "Scanning page",
      phaseDetail:
        typeof latestStageEvent.message === "string" && latestStageEvent.message.trim().length > 0
          ? latestStageEvent.message
          : "Running the next audit step.",
    };
  }

  return {
    phaseLabel: "Starting audit",
    phaseDetail: "Preparing the first pass over your page.",
  };
}

function calculateProvisionalScore(liveChecks: AuditStreamEvent[]) {
  const scoredChecks = liveChecks.filter((event) => event.type === "check");
  if (scoredChecks.length === 0) {
    return null;
  }

  let score = 100;

  for (const check of scoredChecks) {
    if (check.checkStatus === "issue") {
      score -= check.severity === "high" ? 18 : check.severity === "medium" ? 10 : 6;
      continue;
    }

    if (check.checkStatus === "system_error") {
      score -= 7;
    }
  }

  return Math.max(0, Math.round(score));
}

type UseAuditExperienceOptions = {
  reportQueryKeyId: string | null;
  status: string;
  isPending?: boolean;
  displayTargetUrl: string | null;
  placeholderUrl: string | null;
  reportUrl: string | null;
  streamUrl: string | null;
  connectionStatus: "idle" | "connecting" | "open" | "closed";
  events: AuditStreamEvent[];
  liveError: string | null;
  isLiveSession: boolean;
  initialReport?: AuditReport | null;
  reportScoreFallback?: number;
  onConnectToStream?: () => void;
  onMarkVerified?: () => void;
};

export function useAuditExperience({
  reportQueryKeyId,
  status,
  isPending = false,
  displayTargetUrl,
  placeholderUrl,
  reportUrl,
  streamUrl,
  connectionStatus,
  events,
  liveError,
  isLiveSession,
  initialReport = null,
  reportScoreFallback = 0,
  onConnectToStream,
  onMarkVerified,
}: UseAuditExperienceOptions) {
  React.useEffect(() => {
    if (isLiveSession && streamUrl && connectionStatus === "idle" && onConnectToStream) {
      onConnectToStream();
    }
  }, [connectionStatus, isLiveSession, onConnectToStream, streamUrl]);

  const reportQuery = useQuery({
    queryKey:
      isLiveSession && reportQueryKeyId
        ? auditReportQueryKey(reportQueryKeyId)
        : ["audit-report", "idle"],
    enabled: Boolean(isLiveSession && reportQueryKeyId && reportUrl && status === "COMPLETE"),
    queryFn: () => fetchAuditReport(reportUrl!),
    retry: (failureCount, error) =>
      error instanceof ReportPendingError && failureCount < 20,
    retryDelay: 750,
    staleTime: 0,
    initialData: isLiveSession ? (initialReport ?? undefined) : undefined,
  });

  React.useEffect(() => {
    if (reportQuery.data && status !== "VERIFIED" && isLiveSession && onMarkVerified) {
      onMarkVerified();
    }
  }, [isLiveSession, onMarkVerified, reportQuery.data, status]);

  const report = isLiveSession ? (reportQuery.data ?? initialReport) : initialReport;
  const hasAuditFailed = status === "FAILED";
  const pendingReport =
    isLiveSession &&
    (reportQuery.fetchStatus === "fetching" || reportQuery.error instanceof ReportPendingError);
  const userFacingError =
    liveError ||
    (reportQuery.error instanceof Error && !(reportQuery.error instanceof ReportPendingError)
      ? reportQuery.error.message
      : null);

  const headerModel = buildAuditHeaderModel({
    status,
    isPending,
    targetUrl: displayTargetUrl,
    placeholderUrl,
    hasAuditFailed,
    pendingReport,
    hasReport: Boolean(report),
    reportScore:
      typeof report?.summary?.score === "number" ? report.summary.score : reportScoreFallback,
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
        : `${currentProgress}% complete`;
  const { phaseLabel, phaseDetail } = buildLivePhase({
    events,
    hasAuditFailed,
    isPending,
    pendingReport,
    status,
    liveChecksCount: liveChecks.length,
    userFacingError,
  });
  const operationState: "failed" | "pending" | "ready" | "active" = hasAuditFailed
    ? "failed"
    : pendingReport
      ? "pending"
      : report
        ? "ready"
        : "active";
  const provisionalScore = calculateProvisionalScore(liveChecks);
  const liveScoreState: "waiting" | "provisional" | "final" = report
    ? "final"
    : provisionalScore === null
      ? "waiting"
      : "provisional";
  const liveScoreValue =
    liveScoreState === "final"
      ? typeof report?.summary?.score === "number"
        ? report.summary.score
        : null
      : provisionalScore;

  return {
    report,
    pendingReport,
    hasAuditFailed,
    userFacingError,
    headerModel,
    showLivePanels: !report || pendingReport || hasAuditFailed,
    liveStreamRows: [...events].reverse().slice(0, 8).map(buildAuditStreamRowModel),
    liveProgress: {
      phaseLabel,
      phaseDetail,
      gapsCount: liveFindings.length,
      signalsCount: livePassedChecks.length,
      progressValue,
      progressLabel,
      progressBarClassName: hasAuditFailed ? "bg-rose-500" : "bg-primary",
      liveScoreState,
      liveScoreValue,
      evaluatedChecksCount: liveChecks.length,
      showLiveMetrics: liveChecks.length > 0,
      operationState,
    },
  };
}
