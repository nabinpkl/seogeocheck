"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Globe,
  LoaderCircle,
  Radar,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  startAuditAction,
} from "@/app/actions/start-audit";
import { initialAuditActionState } from "@/app/actions/start-audit-state";
import {
  auditReportQueryKey,
  ReportPendingError,
  type AuditReport,
  type AuditReportCheck,
  type AuditStreamEvent,
} from "@/lib/audit";
import { useAuditStore } from "@/store/use-audit-store";
import { useShallow } from "zustand/react/shallow";

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

function severityTone(severity?: string) {
  switch (severity) {
    case "high":
      return "bg-rose-100 text-rose-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function severityCardTone(severity?: string) {
  switch (severity) {
    case "high":
      return "border-rose-500/40 bg-rose-500/[0.08] hover:bg-rose-500/[0.12]";
    case "medium":
      return "border-amber-500/40 bg-amber-500/[0.08] hover:bg-amber-500/[0.12]";
    default:
      return "border-white/10 bg-white/5 hover:bg-white/[0.08]";
  }
}

function severityTextTone(severity?: string) {
  switch (severity) {
    case "high":
      return "text-rose-200/70";
    case "medium":
      return "text-amber-200/70";
    default:
      return "text-blue-200/70";
  }
}

function severityIconTone(severity?: string) {
  switch (severity) {
    case "high":
      return "border-rose-500/20 bg-rose-500/10 text-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
    case "medium":
      return "border-amber-500/20 bg-amber-500/10 text-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    default:
      return "border-primary/20 bg-primary/5 text-primary";
  }
}

function categoryTone(score: number) {
  if (score >= 90) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 75) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

const CATEGORY_LABELS: Record<string, string> = {
  reachability: "Reachability",
  crawlability: "Crawlability",
  indexability: "Indexability",
  contentVisibility: "Content Visibility",
  metadata: "Metadata",
  discovery: "Discovery",
};

const CATEGORY_ORDER = [
  "reachability",
  "crawlability",
  "indexability",
  "contentVisibility",
  "metadata",
  "discovery",
] as const;

function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return "Live now";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) {
    return "Live now";
  }

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderEventLead(event: AuditStreamEvent) {
  if (typeof event.message === "string") {
    return event.message;
  }

  if (typeof event.instruction === "string") {
    return event.instruction;
  }

  return "New audit signal received.";
}

function renderEventDetail(event: AuditStreamEvent) {
  if (typeof event.instruction === "string") {
    return event.instruction;
  }

  if (typeof event.detail === "string") {
    return event.detail;
  }

  return null;
}

function isIssueCheck(status?: string) {
  return status === "issue";
}

function isPassedCheck(status?: string) {
  return status === "passed";
}

function formatStatusLabel(status: string, isPending: boolean) {
  if (status === "IDLE" && isPending) {
    return "STARTING";
  }

  switch (status) {
    case "QUEUED":
      return "STARTING";
    case "STREAMING":
      return "IN PROGRESS";
    case "COMPLETE":
      return "FINALIZING";
    case "FAILED":
      return "NEEDS ATTENTION";
    case "VERIFIED":
      return "READY";
    default:
      return status;
  }
}

function formatConnectionLabel(connectionStatus: string, auditStatus: string) {
  if (auditStatus === "FAILED") {
    return "Failed";
  }

  if (auditStatus === "VERIFIED" || auditStatus === "COMPLETE") {
    return "Complete";
  }

  switch (connectionStatus) {
    case "open":
      return "On";
    case "connecting":
      return "Starting";
    case "closed":
      return "Complete";
    default:
      return "Waiting";
  }
}

function formatCategoryLabel(key: string) {
  const knownLabel = CATEGORY_LABELS[key];
  if (knownLabel) {
    return knownLabel;
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function recommendedFixesBadgeTone(issueCount: number, findings: AuditReportCheck[]) {
  if (issueCount === 0) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (findings.some((finding) => finding.severity === "high")) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function CheckRow({
  check,
  kind,
  isHero = false,
}: {
  check: AuditReportCheck;
  kind: "issue" | "passed";
  isHero?: boolean;
}) {
  const isIssue = kind === "issue";

  return (
    <details
      open={isHero}
      className={`group/row overflow-hidden rounded-2xl border transition-all ${isIssue ? severityCardTone(check.severity) : "border-emerald-500/10 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05]"}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-left">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all group-open/row:rotate-90 ${isIssue ? severityIconTone(check.severity) : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          }`}>
          <ChevronRight className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white tracking-tight">
            {check.label ?? (isIssue ? "Technical Finding" : "Optimized Signal")}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isHero && (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              Critical Action Required
            </span>
          )}
          {isIssue && check.severity && !isHero && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${severityTone(
                check.severity
              )}`}
            >
              {check.severity}
            </span>
          )}
          {!isIssue && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 border border-emerald-500/20">
              Passed
            </span>
          )}
        </div>
      </summary>

      <div className={`border-t border-white/5 px-5 py-4 text-left text-sm ${isIssue ? "text-white/80" : "text-emerald-200/80"}`}>
        <div className="space-y-2">
          {isIssue && check.instruction && (
            <p>
              <span className="font-bold text-white">
                Recommended fix:
              </span>{" "}
              {check.instruction}
            </p>
          )}
          {!isIssue && check.detail && (
            <p>
              <span className="font-bold text-white">
                What is working:
              </span>{" "}
              {check.detail}
            </p>
          )}
          {check.selector && (
            <p>
              <span className="font-bold text-white">
                Page area:
              </span>{" "}
              <code className="rounded bg-white/10 px-2 py-1 text-xs text-white/90 font-mono">
                {check.selector}
              </code>
            </p>
          )}
          {check.metric && (
            <p>
              <span className="font-semibold text-blue-200">Metric:</span>{" "}
              {check.metric}
            </p>
          )}
          {!isIssue && !check.detail && check.instruction && (
            <p>
              <span className="font-semibold text-blue-200">
                Why this passed:
              </span>{" "}
              {check.instruction}
            </p>
          )}
          {isIssue && !check.instruction && check.detail && (
            <p>
              <span className="font-semibold text-blue-200">
                Recommendation:
              </span>{" "}
              {check.detail}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

export function AuditSection() {
  const [url, setUrl] = React.useState("");
  const [actionState, formAction, isPending] = React.useActionState(
    startAuditAction,
    initialAuditActionState
  );
  const [handoffJobId, setHandoffJobId] = React.useState<string | null>(null);
  const [focusedResultJobId, setFocusedResultJobId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const resultPanelRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const {
    jobId,
    targetUrl,
    reportUrl,
    status,
    connectionStatus,
    events,
    liveError,
  } = useAuditStore(
    useShallow((state) => ({
      jobId: state.jobId,
      targetUrl: state.targetUrl,
      reportUrl: state.reportUrl,
      status: state.status,
      connectionStatus: state.connectionStatus,
      events: state.events,
      liveError: state.error,
    }))
  );
  const { primeAudit, connectToStream, markVerified, reset } = useAuditStore(
    useShallow((state) => ({
      primeAudit: state.primeAudit,
      connectToStream: state.connectToStream,
      markVerified: state.markVerified,
      reset: state.reset,
    }))
  );

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (
      !actionState.ok ||
      !actionState.jobId ||
      !actionState.streamUrl ||
      !actionState.reportUrl ||
      !actionState.status
    ) {
      return;
    }

    primeAudit({
      jobId: actionState.jobId,
      targetUrl: actionState.targetUrl,
      streamUrl: actionState.streamUrl,
      reportUrl: actionState.reportUrl,
      status: actionState.status === "QUEUED" ? "QUEUED" : "STREAMING",
    });
    connectToStream();
    setHandoffJobId(null);
  }, [
    actionState.jobId,
    actionState.ok,
    actionState.reportUrl,
    actionState.status,
    actionState.streamUrl,
    actionState.targetUrl,
    connectToStream,
    primeAudit,
  ]);

  React.useEffect(() => {
    if (status !== "COMPLETE" || !jobId || !reportUrl || handoffJobId === jobId) {
      return;
    }

    setHandoffJobId(jobId);
    void queryClient.invalidateQueries({
      queryKey: auditReportQueryKey(jobId),
    });
  }, [handoffJobId, jobId, queryClient, reportUrl, status]);

  const reportQuery = useQuery({
    queryKey: jobId ? auditReportQueryKey(jobId) : ["audit-report", "idle"],
    enabled: Boolean(jobId && reportUrl && handoffJobId === jobId),
    queryFn: () => fetchAuditReport(reportUrl!),
    retry: (failureCount, error) =>
      error instanceof ReportPendingError && failureCount < 20,
    retryDelay: 750,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (reportQuery.data && status !== "VERIFIED") {
      markVerified();
    }
  }, [markVerified, reportQuery.data, status]);

  const currentProgress =
    [...events].reverse().find((event) => typeof event.progress === "number")
      ?.progress ?? 0;
  const pendingReport =
    reportQuery.fetchStatus === "fetching" ||
    reportQuery.error instanceof ReportPendingError;
  const report = reportQuery.data;
  const reportChecks = Array.isArray(report?.checks) ? report.checks : [];
  const reportFindings = reportChecks.filter((check) => isIssueCheck(check.status));
  const reportPassedChecks = reportChecks.filter((check) => isPassedCheck(check.status));
  const liveChecks = events.filter((event) => event.type === "check");
  const liveFindings = liveChecks.filter((event) => isIssueCheck(event.checkStatus));
  const livePassedChecks = liveChecks.filter((event) => isPassedCheck(event.checkStatus));
  const reportScore =
    typeof report?.summary?.score === "number" ? report.summary.score : 0;
  const issueCount =
    typeof report?.summary?.issueCount === "number"
      ? report.summary.issueCount
      : reportFindings.length;
  const passedCheckCount =
    typeof report?.summary?.passedCheckCount === "number"
      ? report.summary.passedCheckCount
      : reportPassedChecks.length;
  const hasVerifiedSignature = Boolean(report?.signature?.present);
  const hasAuditFailed = status === "FAILED";
  const isAuditSettled = Boolean(report) || status === "FAILED";
  const isAuditActive = Boolean(jobId) && !isAuditSettled;
  const showProgressSidebar = !report;
  const categoryScores = report?.categories
    ? [
      ...CATEGORY_ORDER.filter((key) =>
        Object.prototype.hasOwnProperty.call(report.categories, key)
      ).map((key) => ({
        key,
        label: formatCategoryLabel(key),
        score:
          typeof report.categories?.[key] === "number" ? report.categories[key] : 0,
      })),
      ...Object.entries(report.categories)
        .filter(([key]) => !CATEGORY_ORDER.includes(key as (typeof CATEGORY_ORDER)[number]))
        .map(([key, value]) => ({
          key,
          label: formatCategoryLabel(key),
          score: typeof value === "number" ? value : 0,
        })),
    ]
    : [];
  const userFacingError =
    actionState.error ||
    liveError ||
    (reportQuery.error instanceof Error &&
      !(reportQuery.error instanceof ReportPendingError)
      ? reportQuery.error.message
      : null);
  const progressValue = hasAuditFailed ? 100 : report ? 100 : currentProgress;
  const progressLabel = hasAuditFailed ? "Failed" : report ? "Ready" : `${currentProgress}%`;
  const progressBarClassName = hasAuditFailed ? "bg-rose-500" : "bg-primary";
  const recommendedFixesBadgeClassName = recommendedFixesBadgeTone(
    issueCount,
    reportFindings
  );
  const currentStepMessage = hasAuditFailed
    ? userFacingError ?? "We couldn't finish reviewing this site."
    : pendingReport
      ? "Putting the final touches on your results"
      : report
        ? "Your results are ready"
        : "Checking your site";

  React.useEffect(() => {
    if (!report || !jobId || focusedResultJobId === jobId || !resultPanelRef.current) {
      return;
    }

    const nextTop =
      resultPanelRef.current.getBoundingClientRect().top + window.scrollY - 96;

    window.scrollTo({
      top: Math.max(nextTop, 0),
      behavior: "smooth",
    });
    setFocusedResultJobId(jobId);
  }, [focusedResultJobId, jobId, report]);

  const handleReset = () => {
    reset();
    setHandoffJobId(null);
    setFocusedResultJobId(null);
    setUrl("");
    queryClient.removeQueries({
      queryKey: jobId ? auditReportQueryKey(jobId) : ["audit-report", "idle"],
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div className="w-full self-stretch">
      <form action={formAction} className="mx-auto mt-16 mb-12 w-full max-w-2xl px-4 sm:px-0">
        <div className="group relative">
          <div className="relative flex flex-col rounded-2xl border border-white bg-white p-1.5 shadow-xl sm:flex-row sm:items-center transition-all focus-within:ring-4 focus-within:ring-white/10">
            <div className="flex flex-1 items-center px-4 sm:px-6">
              <Globe className="h-5 w-5 text-foreground/20 transition-colors group-focus-within:text-primary" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                name="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={isPending || isAuditActive}
                placeholder="Enter your website URL (e.g. example.com)"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-foreground/35 sm:text-base sm:placeholder:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || isAuditActive}
              className="group/btn relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-blue-500 disabled:shadow-none disabled:hover:scale-100 sm:mt-0 sm:min-w-[180px] sm:w-auto sm:text-base"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transition-transform group-hover/btn:translate-y-0" />
              {isPending ? (
                <>
                  <RotateCcw className="h-5 w-5 animate-spin" />
                  Interrogating AI...
                </>
              ) : isAuditActive ? (
                <>
                  <RotateCcw className="h-5 w-5 animate-spin" />
                  Analyzing Visibility
                </>
              ) : (
                <>
                  Analyze Visibility
                  <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence initial={false}>
        {(jobId || isPending || userFacingError) && (
          <motion.div
            ref={resultPanelRef}
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="mx-auto mt-16 w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-blue-950/60 shadow-2xl backdrop-blur-xl"
          >
            <div
              className={`grid gap-0 ${showProgressSidebar ? "md:grid-cols-[1.35fr_0.85fr]" : ""
                }`}
            >
              <div className="p-8 md:p-12">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${status === "FAILED"
                          ? "bg-rose-500"
                          : status === "VERIFIED"
                            ? "bg-emerald-500"
                            : "animate-pulse bg-primary"
                        }`}
                    />
                    {formatStatusLabel(status, isPending)}
                  </span>
                  <span className="text-sm text-blue-500">
                    {targetUrl || actionState.targetUrl || "Preparing your audit"}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-3 text-white">
                  {hasAuditFailed ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-rose-500" />
                      <p className="text-lg font-semibold text-rose-700">
                        We hit a problem reviewing your site
                      </p>
                    </>
                  ) : pendingReport ? (
                    <>
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold">
                        Finalizing your results
                      </p>
                    </>
                  ) : !report && (
                    <>
                      <Radar className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold">
                        Reviewing your site now
                      </p>
                    </>
                  )}
                </div>

                {userFacingError && (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                    {userFacingError}
                  </div>
                )}

                {!report && (
                  <div className="mt-8 space-y-4">
                    {events.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-5 py-6 text-sm text-blue-500">
                        Getting your first results ready...
                      </div>
                    ) : (
                      events.map((event) => (
                        <div
                          key={String(event.eventId)}
                          className={`rounded-2xl border px-5 py-4 ${event.type === "error"
                              ? "border-rose-900/40 bg-rose-950/20"
                              : isPassedCheck(event.checkStatus)
                                ? "border-emerald-900/40 bg-emerald-950/20"
                                : "border-white/5 bg-white/5"
                            }`}
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <CheckCircle2
                              className={`h-5 w-5 ${event.type === "error"
                                  ? "text-rose-500"
                                  : isIssueCheck(event.checkStatus)
                                    ? "text-primary"
                                    : isPassedCheck(event.checkStatus)
                                      ? "text-emerald-500"
                                      : event.type === "complete"
                                        ? "text-emerald-500"
                                        : "text-blue-500"
                                }`}
                            />
                            <span className="text-sm font-semibold text-blue-200">
                              {renderEventLead(event)}
                            </span>
                            {typeof event.severity === "string" && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${severityTone(
                                  event.severity
                                )}`}
                              >
                                {event.severity}
                              </span>
                            )}
                            {isPassedCheck(event.checkStatus) && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                                Passed
                              </span>
                            )}
                            <span className="ml-auto text-xs text-blue-500">
                              {formatTimestamp(
                                typeof event.timestamp === "string"
                                  ? event.timestamp
                                  : undefined
                              )}
                            </span>
                          </div>

                          {(event.selector || renderEventDetail(event)) && (
                            <details className="mt-3 rounded-xl bg-white/5 px-4 py-3 text-left text-sm text-blue-400/80">
                              <summary className="cursor-pointer list-none font-semibold text-blue-300">
                                {isPassedCheck(event.checkStatus) ? "Why this passed" : "Suggested fix"}
                              </summary>
                              <div className="mt-3 space-y-2">
                                {typeof event.selector === "string" && (
                                  <p>
                                    <span className="font-semibold text-blue-300">
                                      Page area:
                                    </span>{" "}
                                    <code className="rounded bg-white/10 px-2 py-1 text-xs">
                                      {event.selector}
                                    </code>
                                  </p>
                                )}
                                {renderEventDetail(event) && (
                                  <p>
                                    <span className="font-semibold text-blue-300">
                                      {isPassedCheck(event.checkStatus) ? "What went well:" : "Recommendation:"}
                                    </span>{" "}
                                    {renderEventDetail(event)}
                                  </p>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {report && (
                  <div className="mt-8 space-y-5">
                    {/* Command Hub: Unified Audit Stats */}
                    <div className="group/hub relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-blue-950/40 p-10 shadow-[0_45px_100px_rgba(0,0,0,0.5)] md:p-12 lg:p-14">
                      {/* Decorative Background Elements */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-black/10" />
                      </div>

                      <div className="relative flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-16 xl:gap-24">
                        {/* Primary Stat: Visibility Rating: Circular HUD */}
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200/60 mb-6">
                            Visibility Score
                          </div>
                          
                          <div className="relative h-44 w-44 flex items-center justify-center font-mono group/score">
                            {/* SVG Gauge Background */}
                            <svg className="absolute inset-0 h-full w-full rotate-[-90deg]" viewBox="0 0 160 160">
                              <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-white/[0.05]" />
                              <circle 
                                cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" 
                                strokeDasharray={2 * Math.PI * 70}
                                strokeDashoffset={2 * Math.PI * 70 * (1 - reportScore / 100)}
                                className={`${reportScore > 70 ? "text-emerald-500" : reportScore > 40 ? "text-primary" : "text-rose-500"} transition-all duration-1000 ease-out`}
                                strokeLinecap="round"
                              />
                            </svg>
                            
                            {/* Score Display */}
                            <div className="flex flex-col items-center leading-none group-hover/score:scale-110 transition-transform duration-300">
                              <span className="text-6xl font-black text-white tracking-tighter">{reportScore}</span>
                              <span className="text-[10px] font-black text-blue-400/40 uppercase tracking-[0.2em] mt-1">/100</span>
                            </div>
                          </div>

                          <div className="mt-8 flex items-center gap-2.5 rounded-2xl bg-white/[0.03] border border-white/5 py-2.5 px-5 backdrop-blur-md">
                            <div className={`h-1.5 w-1.5 rounded-full ${reportScore > 70 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : reportScore > 40 ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                              {reportScore > 70 ? "High Authority" : reportScore > 40 ? "Moderate Reach" : "Optimizing Visibility"}
                            </span>
                          </div>
                        </div>

                        {/* Subtle Vertical Divider */}
                        <div className="hidden lg:block h-32 w-px bg-white/10" />

                        {/* Secondary Stats Group */}
                        <div className="flex items-center gap-12 sm:gap-20 lg:gap-16 xl:gap-24">
                          {/* Gaps Hub */}
                          <button 
                            onClick={() => document.getElementById('requires-attention')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group/stat flex flex-col items-center lg:items-start transition-transform hover:scale-105 cursor-pointer text-left"
                          >
                            <div className="text-6xl font-black text-rose-500 font-mono leading-none tracking-tighter lg:text-7xl drop-shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                              {issueCount}
                            </div>
                            <div className="mt-2 text-[9px] font-bold text-rose-100/40 uppercase tracking-[0.2em]">
                              Things need your attention   
                            </div>
                            <div className="mt-4 h-0.5 w-8 bg-rose-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-rose-500/40" />
                          </button>

                          {/* Signals Hub */}
                          <button 
                            onClick={() => document.getElementById('passed-checks')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group/stat flex flex-col items-center lg:items-start transition-transform hover:scale-105 cursor-pointer text-left"
                          >
                            <div className="text-6xl font-black text-emerald-500 font-mono leading-none tracking-tighter lg:text-7xl drop-shadow-[0_0_20_rgba(16,185,129,0.2)]">
                              {passedCheckCount}
                            </div>
                            <div className="mt-2 text-[9px] font-bold text-emerald-100/40 uppercase tracking-[0.2em]">
                              Checks passed
                            </div>
                            <div className="mt-4 h-0.5 w-8 bg-emerald-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-emerald-500/40" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Technical Breakdown Section */}
                    {categoryScores.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-6 py-4">
                          <div className="h-px flex-1 bg-white/10" />
                          <div className="rounded-full border border-white/10 bg-white/5 px-6 py-2 backdrop-blur-sm">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-200">
                              Technical Scores
                            </h3>
                          </div>
                          <div className="h-px flex-1 bg-white/10" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryScores.map((category) => (
                            <div key={category.key} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-100">{category.label}</span>
                                <span className={`text-sm font-black font-mono ${category.score > 70 ? "text-emerald-400" : category.score > 40 ? "text-primary" : "text-rose-400"
                                  }`}>{category.score}</span>
                              </div>
                              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className={`h-full opacity-60 transition-all duration-1000 ${category.score > 70 ? "bg-emerald-500" : category.score > 40 ? "bg-primary" : "bg-rose-500"
                                    }`}
                                  style={{ width: `${category.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-12">
                      <section id="requires-attention" className="space-y-6 scroll-mt-10">
                        <div className="flex items-end justify-between px-2">
                          <div className="flex flex-col gap-1">
                            <h3 className="text-2xl font-black text-white tracking-tight">
                              Requires Your Attention
                            </h3>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">
                            {issueCount} Issues Detected
                          </span>
                        </div>

                        {/* Feature the Top Priority (Critical Action) but using the shared CheckRow style */}
                        {(() => {
                          const topCheck = reportChecks.find(c => c.label === report.summary?.topIssue);
                          if (!topCheck) return null;

                          return (
                            <div className="mb-4">
                              <CheckRow
                                check={topCheck}
                                kind="issue"
                                isHero={true}
                              />
                            </div>
                          );
                        })()}

                        {reportFindings.filter(finding => finding.label !== report.summary?.topIssue).length === 0 ? (
                          !reportChecks.find(c => c.label === report.summary?.topIssue) && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-800">
                              No urgent issues were flagged in this audit. Your site cleared every tracked check in this slice.
                            </div>
                          )
                        ) : (
                          <div className="space-y-3">
                            {reportFindings
                              .filter(finding => finding.label !== report.summary?.topIssue)
                              .map((finding, index) => (
                                <CheckRow
                                  key={finding.id ?? `${finding.selector}-${index}`}
                                  check={finding}
                                  kind="issue"
                                />
                              ))}
                          </div>
                        )}
                      </section>

                      <section id="passed-checks" className="space-y-6 scroll-mt-10">
                        <div className="flex items-end justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight">
                              Passed Checks
                            </h3>
                          </div>
                          <span className="text-sm font-bold text-blue-400/80">
                            {passedCheckCount} Validated
                          </span>
                        </div>

                        {reportPassedChecks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border px-5 py-5 text-sm text-foreground/55">
                            We did not capture any confirmed passed checks for this run.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {reportPassedChecks.map((check, index) => (
                              <CheckRow
                                key={check.id ?? `${check.selector}-${index}`}
                                check={check}
                                kind="passed"
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}
              </div>

              {showProgressSidebar && (
                <div className="border-t border-border bg-secondary/20 p-8 md:border-t-0 md:border-l">
                  <div className="rounded-3xl bg-blue-900/40 p-6 shadow-sm">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-blue-500">
                      Progress
                    </div>
                    <div className="mt-6 space-y-5">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Live updates
                        </div>
                        <div
                          className={`mt-2 text-lg font-semibold ${hasAuditFailed ? "text-rose-400" : "text-white"
                            }`}
                        >
                          {formatConnectionLabel(connectionStatus, status)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Website
                        </div>
                        <div className="mt-2 break-all text-sm text-blue-300">
                          {targetUrl || actionState.targetUrl || "Waiting"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Issues found
                        </div>
                        <div className="mt-2 text-4xl font-black text-primary">
                          {liveFindings.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Checks passed
                        </div>
                        <div className="mt-2 text-4xl font-black text-emerald-400">
                          {livePassedChecks.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Progress
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressBarClassName}`}
                            style={{
                              width: `${progressValue}%`,
                            }}
                          />
                        </div>
                        <div
                          className={`mt-2 text-sm ${hasAuditFailed ? "text-rose-400" : "text-blue-400"
                            }`}
                        >
                          {progressLabel}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                          Current step
                        </div>
                        <div
                          className={`mt-2 flex items-center gap-2 text-sm ${hasAuditFailed ? "text-rose-400" : "text-blue-300"
                            }`}
                        >
                          {hasAuditFailed ? (
                            <>
                              <AlertCircle className="h-4 w-4 text-rose-500" />
                              {currentStepMessage}
                            </>
                          ) : pendingReport ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                              {currentStepMessage}
                            </>
                          ) : report ? (
                            <>
                              <BadgeCheck className="h-4 w-4 text-emerald-500" />
                              {currentStepMessage}
                            </>
                          ) : (
                            <>
                              <Radar className="h-4 w-4 text-primary" />
                              {currentStepMessage}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(report || status === "FAILED") && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-6 w-full rounded-2xl border border-primary/20 bg-white/5 px-5 py-4 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/10"
                    >
                      Run another audit
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
