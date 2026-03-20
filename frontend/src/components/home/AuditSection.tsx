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
  FileText,
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
      return "border-rose-200 bg-rose-50/40 hover:bg-rose-50/60";
    case "medium":
      return "border-amber-200 bg-amber-50/40 hover:bg-amber-50/60";
    default:
      return "border-blue-200/50 bg-blue-50/30 hover:bg-blue-50/50";
  }
}

function severityIconTone(severity?: string) {
  switch (severity) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-600 shadow-sm";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-600 shadow-sm";
    default:
      return "border-blue-200 bg-blue-50 text-blue-600 shadow-sm";
  }
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

function formatEvidenceSource(evidenceSource?: string) {
  if (evidenceSource === "source_html") {
    return "Source HTML";
  }

  if (evidenceSource === "rendered_dom") {
    return "Rendered DOM";
  }

  if (evidenceSource === "surface_comparison") {
    return "Surface Comparison";
  }

  if (!evidenceSource) {
    return null;
  }

  return evidenceSource.replaceAll("_", " ");
}

function formatStructuredDataKinds(kinds?: string[]) {
  if (!Array.isArray(kinds) || kinds.length === 0) {
    return "None detected";
  }

  return kinds.join(", ");
}

function renderDependencyTone(risk?: string) {
  switch (risk) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatRenderDependencyLabel(risk?: string) {
  switch (risk) {
    case "high":
      return "High render dependency";
    case "medium":
      return "Medium render dependency";
    case "low":
      return "Low render dependency";
    default:
      return "Rendered comparison unavailable";
  }
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
  const evidenceSourceLabel = formatEvidenceSource(check.metadata?.evidenceSource);

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
          <div className="truncate text-sm font-bold text-slate-900 tracking-tight">
            {check.label ?? (isIssue ? "Technical Finding" : "Optimized Signal")}
          </div>
          {evidenceSourceLabel && (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Audited from {evidenceSourceLabel}
            </div>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isHero && (
            <span className={`rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${check.severity === 'high'
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : check.severity === 'medium'
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-blue-200 bg-blue-50 text-blue-600'
              }`}>
              {check.severity === 'high' ? 'Critical Action Required' : (check.severity ?? 'Note')}
            </span>
          )}
          {isIssue && check.severity && !isHero && (
            <span
              className={`rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${severityTone(
                check.severity
              )}`}
            >
              {check.severity}
            </span>
          )}
          {!isIssue && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700 border border-emerald-500/20">
              Passed
            </span>
          )}
        </div>
      </summary>

      <div className={`border-t border-slate-100 px-5 py-4 text-left text-sm ${isIssue ? "text-slate-600" : "text-emerald-700"}`}>
        <div className="space-y-2">
          {isIssue && check.instruction && (
            <p>
              <span className="font-bold text-slate-900">
                Recommended fix:
              </span>{" "}
              {check.instruction}
            </p>
          )}
          {!isIssue && check.detail && (
            <p>
              <span className="font-bold text-slate-900">
                What is working:
              </span>{" "}
              {check.detail}
            </p>
          )}
          {check.selector && (
            <p>
              <span className="font-bold text-slate-900">
                Page area:
              </span>{" "}
              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 font-mono border border-slate-200">
                {check.selector}
              </code>
            </p>
          )}
          {check.metric && (
            <p>
              <span className="font-semibold text-slate-900">Metric:</span>{" "}
              {check.metric}
            </p>
          )}
          {!isIssue && !check.detail && check.instruction && (
            <p>
              <span className="font-semibold text-slate-900">
                Why this passed:
              </span>{" "}
              {check.instruction}
            </p>
          )}
          {isIssue && !check.instruction && check.detail && (
            <p>
              <span className="font-semibold text-slate-900">
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
  const [clientError, setClientError] = React.useState<string | null>(null);
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
    if (clientError) {
      const timer = setTimeout(() => {
        setClientError(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clientError]);

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
  const sourceHtmlSummary = report?.rawSummary?.sourceHtml;
  const renderedDomSummary = report?.rawSummary?.renderedDom;
  const renderComparisonSummary = report?.rawSummary?.renderComparison;
  const capturePasses = Array.isArray(report?.rawSummary?.capturePasses)
    ? report.rawSummary.capturePasses
    : [];
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
    setClientError(null);
    queryClient.removeQueries({
      queryKey: jobId ? auditReportQueryKey(jobId) : ["audit-report", "idle"],
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div className="w-full self-stretch">
      <form
        action={formAction}
        onSubmit={(e) => {
          const trimmedUrl = url.trim();
          if (!trimmedUrl) {
            e.preventDefault();
            setClientError("Enter a website URL to start the audit.");
            return;
          }

          const targetUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
            ? trimmedUrl
            : `https://${trimmedUrl}`;

          try {
            const urlObj = new URL(targetUrl);
            if (!urlObj.hostname.includes(".")) {
              e.preventDefault();
              setClientError("Please enter a valid domain (e.g., example.com)");
              return;
            }
          } catch {
            e.preventDefault();
            setClientError("That URL does not look valid yet.");
            return;
          }
          setClientError(null);
        }}
        className="mx-auto mt-16 mb-12 w-full max-w-2xl px-4 sm:px-0"
      >
        <div className="group relative">
          <AnimatePresence>
            {clientError && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute -top-10 left-0 right-0 z-30 flex justify-start px-2"
              >
                <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-600 shadow-sm backdrop-blur-sm">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {clientError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`relative flex flex-col rounded-2xl border bg-white p-1.5 shadow-xl sm:flex-row sm:items-center transition-all focus-within:ring-4 focus-within:ring-primary/5 ${clientError ? "border-rose-300 ring-4 ring-rose-500/10" : "border-slate-200"
              }`}
          >
            <div className="flex flex-1 items-center px-4 sm:px-6">
              <Globe className={`h-5 w-5 transition-colors ${clientError ? "text-rose-400" : "text-slate-400 group-focus-within:text-primary"}`} />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                name="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (clientError) setClientError(null);
                }}
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

          <div className={`mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 ${(isPending || isAuditActive) ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"}`}>
            <span className="text-white/20">•</span>
            <span className="text-white/30">Ready to test?</span>
            <button
              type="button"
              onClick={() => {
                setUrl("example.com");
                setClientError(null);
              }}
              className="text-white/70 hover:text-white transition-all underline underline-offset-4 decoration-white/20 hover:decoration-white/50"
            >
              example.com
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
            className="mx-auto mt-16 w-full max-w-6xl"
          >
            <div
              className={`grid gap-6 ${showProgressSidebar ? "lg:grid-cols-[1fr_380px]" : "grid-cols-1"
                }`}
            >
              <div className="flex flex-col gap-6">
                {/* Status & Header Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
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
                    {(targetUrl || actionState.targetUrl) ? (
                      <a
                        href={targetUrl || actionState.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-400 hover:text-primary transition-all underline-offset-4 underline decoration-slate-200 hover:decoration-primary/50"
                      >
                        {targetUrl || actionState.targetUrl}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Preparing your audit
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-slate-900">
                    {hasAuditFailed ? (
                      <>
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                        <p className="text-xl font-bold tracking-tight text-rose-800">
                          Technical Audit Interrupted
                        </p>
                      </>
                    ) : pendingReport ? (
                      <>
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <p className="text-xl font-bold tracking-tight">
                          Finalizing Intelligence Data
                        </p>
                      </>
                    ) : (reportScore > 0 || report) ? (
                      <>
                        <FileText className="h-5 w-5 text-primary" />
                        <p className="text-xl font-bold tracking-tight">
                          Visibility Analysis & Search Intelligence Report
                        </p>
                      </>
                    ) : (
                      <>
                        <Radar className="h-5 w-5 text-primary" />
                        <p className="text-xl font-bold tracking-tight">
                          Reviewing Technical Search Signals
                        </p>
                      </>
                    )}
                  </div>

                  {userFacingError && (
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                      {userFacingError}
                    </div>
                  )}
                </div>

                {!report && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Live Audit Stream
                    </div>
                    {events.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400">
                        <LoaderCircle className="mx-auto mb-4 h-6 w-6 animate-spin text-primary/40" />
                        Waiting for technical signals...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {events.map((event) => (
                          <div
                            key={String(event.eventId)}
                            className={`rounded-2xl border px-5 py-4 ${event.type === "error"
                              ? "border-rose-100 bg-rose-50/30"
                              : isPassedCheck(event.checkStatus)
                                ? "border-emerald-100 bg-emerald-50/30"
                                : "border-slate-100 bg-slate-50"
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
                                        : "text-slate-400"
                                  }`}
                              />
                              <span className="text-sm font-semibold text-slate-700">
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
                              <span className="ml-auto text-xs text-slate-400">
                                {formatTimestamp(
                                  typeof event.timestamp === "string"
                                    ? event.timestamp
                                    : undefined
                                )}
                              </span>
                            </div>

                            {(event.selector || renderEventDetail(event)) && (
                              <details className="mt-3 rounded-xl bg-white/50 border border-slate-100 px-4 py-3 text-left text-sm text-slate-600">
                                <summary className="cursor-pointer list-none font-semibold text-slate-700">
                                  {isPassedCheck(event.checkStatus) ? "Why this passed" : "Suggested fix"}
                                </summary>
                                <div className="mt-3 space-y-2">
                                  {typeof event.selector === "string" && (
                                    <p>
                                      <span className="font-semibold text-slate-700">
                                        Page area:
                                      </span>{" "}
                                      <code className="rounded bg-white px-2 py-1 text-xs border border-slate-200 text-slate-700">
                                        {event.selector}
                                      </code>
                                    </p>
                                  )}
                                  {renderEventDetail(event) && (
                                    <p>
                                      <span className="font-semibold text-slate-700">
                                        {isPassedCheck(event.checkStatus) ? "What went well:" : "Recommendation:"}
                                      </span>{" "}
                                      {renderEventDetail(event)}
                                    </p>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {report && (
                  <>
                    {/* Command Hub Card */}
                    <div className="group/hub relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm md:p-12 lg:p-14">
                      {/* Decorative Background Elements */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-slate-50/50" />
                      </div>

                      <div className="relative flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-16 xl:gap-24">
                        {/* Primary Stat: Visibility Rating: Circular HUD */}
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                            Visibility Score
                          </div>

                          <div className="relative h-44 w-44 flex items-center justify-center font-mono group/score">
                            {/* SVG Gauge Background */}
                            <svg className="absolute inset-0 h-full w-full rotate-[-90deg]" viewBox="0 0 160 160">
                              <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100" />
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
                              <span className="text-6xl font-black text-slate-900 tracking-tighter">{reportScore}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">/100</span>
                            </div>
                          </div>

                          <div className="mt-8 flex items-center gap-2.5 rounded-2xl bg-white border border-slate-200 py-2.5 px-5 shadow-sm">
                            <div className={`h-1.5 w-1.5 rounded-full ${reportScore > 70 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : reportScore > 40 ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                              {reportScore > 70 ? "High Authority" : reportScore > 40 ? "Moderate Reach" : "Optimizing Visibility"}
                            </span>
                          </div>
                        </div>

                        {/* Subtle Vertical Divider */}
                        <div className="hidden lg:block h-32 w-px bg-slate-200" />

                        {/* Secondary Stats Group */}
                        <div className="flex items-center gap-12 sm:gap-20 lg:gap-16 xl:gap-24">
                          {/* Gaps Hub */}
                          <button
                            onClick={() => document.getElementById('requires-attention')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group/stat flex flex-col items-center lg:items-start transition-transform hover:scale-105 cursor-pointer text-left"
                          >
                            <div className="text-6xl font-black text-rose-500 font-mono leading-none tracking-tighter lg:text-7xl drop-shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                              {issueCount}
                            </div>
                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                              Things need your attention
                            </div>
                            <div className="mt-4 h-0.5 w-8 bg-rose-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-rose-500" />
                          </button>

                          {/* Signals Hub */}
                          <button
                            onClick={() => document.getElementById('passed-checks')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group/stat flex flex-col items-center lg:items-start transition-transform hover:scale-105 cursor-pointer text-left"
                          >
                            <div className="text-6xl font-black text-emerald-500 font-mono leading-none tracking-tighter lg:text-7xl drop-shadow-[0_0_20_rgba(16,185,129,0.1)]">
                              {passedCheckCount}
                            </div>
                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                              Checks passed
                            </div>
                            <div className="mt-4 h-0.5 w-8 bg-emerald-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-emerald-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Technical Breakdown Card */}
                    {categoryScores.length > 0 && (
                      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="mb-8 flex items-center gap-4">
                          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                            Technical Scores
                          </h3>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryScores.map((category) => (
                            <div key={category.key} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30 p-5 transition-all hover:bg-slate-50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">{category.label}</span>
                                <span className={`text-sm font-black font-mono ${category.score > 70 ? "text-emerald-600" : category.score > 40 ? "text-primary" : "text-rose-600"
                                  }`}>{category.score}</span>
                              </div>
                              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white border border-slate-100">
                                <div
                                  className={`h-full transition-all duration-1000 ${category.score > 70 ? "bg-emerald-500" : category.score > 40 ? "bg-primary" : "bg-rose-500"
                                    }`}
                                  style={{ width: `${category.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audit Surface Card (Redesigned Compact) */}
                    {!!report?.rawSummary && (
                      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="flex flex-col gap-6">
                          {/* Top: Meta info & Primary Description */}
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Audit Surface</div>
                              <p className="text-xs text-slate-500 max-w-xl">Google prioritizes source HTML. We compare static vs rendered states to identify JavaScript dependencies.</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {capturePasses.map((pass) => (
                                <span key={pass} className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm transition-colors hover:bg-white">
                                  {formatEvidenceSource(pass) ?? pass}
                                </span>
                              ))}
                              <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${renderDependencyTone(renderComparisonSummary?.renderDependencyRisk)} shadow-sm`}>
                                {formatRenderDependencyLabel(renderComparisonSummary?.renderDependencyRisk)}
                              </div>
                            </div>
                          </div>

                          {/* Middle: 4-Col Grid of Primary Metrics */}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                              { label: "Source Word Count", value: sourceHtmlSummary?.wordCount ?? 0, type: "static" },
                              { label: "Source Links", value: sourceHtmlSummary?.sameOriginCrawlableLinkCount ?? 0, type: "static" },
                              { label: "Rendered Word Count", value: renderedDomSummary?.wordCount ?? "—", type: "dynamic" },
                              { label: "Rendered Links", value: renderedDomSummary?.sameOriginCrawlableLinkCount ?? "—", type: "dynamic" },
                            ].map((stat, i) => (
                              <div key={i} className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 shadow-sm">
                                <span className={`text-[8px] font-black uppercase tracking-wider ${stat.type === "static" ? "text-slate-400" : "text-primary/70"}`}>
                                  {stat.label}
                                </span>
                                <span className="text-lg font-black text-slate-900 leading-none">{stat.value}</span>
                              </div>
                            ))}
                          </div>

                          {/* Bottom: Surface Intelligence Strip */}
                          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 border-r border-slate-100 pr-6">
                                <span className="text-sm font-black text-rose-500">{renderComparisonSummary?.sourceOnlyCriticalIssues ?? 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Critical Gaps</span>
                              </div>
                              <div className="flex items-center gap-2 border-r border-slate-100 pr-6">
                                <span className="text-sm font-black text-primary">{renderComparisonSummary?.renderedOnlySignals ?? 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Rendered Signals</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">{renderComparisonSummary?.mismatches ?? 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Mismatches</span>
                              </div>
                            </div>
                            <div className="flex gap-4 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-300">Schema (S)</span>
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{formatStructuredDataKinds(sourceHtmlSummary?.structuredDataKinds)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-300">Schema (R)</span>
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{formatStructuredDataKinds(renderedDomSummary?.structuredDataKinds)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requires Attention Card */}
                    <section id="requires-attention" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm scroll-mt-24 space-y-6">
                      <div className="flex items-end justify-between px-2">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                            Requires Your Attention
                          </h3>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {issueCount} Issues Detected
                        </span>
                      </div>

                      {/* Feature the Top Priority (Critical Action) */}
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
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-800 text-center">
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

                    {/* Passed Checks Card */}
                    <section id="passed-checks" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm scroll-mt-24 space-y-6">
                      <div className="flex items-end justify-between px-2">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Passed Checks
                          </h3>
                        </div>
                        <span className="text-sm font-bold text-slate-400">
                          {passedCheckCount} Validated
                        </span>
                      </div>

                      {reportPassedChecks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400">
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

                    {(report || status === "FAILED") && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                      >
                        Run another audit
                      </button>
                    )}
                  </>
                )}
              </div>

              {showProgressSidebar && (
                <div className="lg:sticky lg:top-24 h-fit space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                      Live Pulse
                    </div>
                    <div className="mt-8 space-y-6">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Connection
                        </div>
                        <div
                          className={`mt-2 text-xl font-bold ${hasAuditFailed ? "text-rose-600" : "text-slate-900"
                            }`}
                        >
                          {formatConnectionLabel(connectionStatus, status)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Targets
                        </div>
                        <div className="mt-2 break-all text-sm font-medium text-slate-600">
                          {targetUrl || actionState.targetUrl || "Waiting"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">
                            Gaps
                          </div>
                          <div className="text-3xl font-black text-rose-500">
                            {liveFindings.length}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">
                            Signals
                          </div>
                          <div className="text-3xl font-black text-emerald-500">
                            {livePassedChecks.length}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                          Visibility Mapping
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressBarClassName}`}
                            style={{
                              width: `${progressValue}%`,
                            }}
                          />
                        </div>
                        <div
                          className={`mt-2 text-[10px] font-black font-mono ${hasAuditFailed ? "text-rose-600" : "text-slate-500"
                            }`}
                        >
                          {progressLabel}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                          Active Operation
                        </div>
                        <div
                          className={`flex items-center gap-2 text-sm font-bold ${hasAuditFailed ? "text-rose-600" : "text-slate-900"
                            }`}
                        >
                          {hasAuditFailed ? (
                            <>
                              <AlertCircle className="h-4 w-4 text-rose-500" />
                              <span className="truncate">{currentStepMessage}</span>
                            </>
                          ) : pendingReport ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                              <span className="truncate">{currentStepMessage}</span>
                            </>
                          ) : report ? (
                            <>
                              <BadgeCheck className="h-4 w-4 text-emerald-500" />
                              <span className="truncate">{currentStepMessage}</span>
                            </>
                          ) : (
                            <>
                              <Radar className="h-4 w-4 text-primary animate-pulse" />
                              <span className="truncate">{currentStepMessage}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
