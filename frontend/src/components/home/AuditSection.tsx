"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  LoaderCircle,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
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
      return "bg-slate-100 text-slate-700";
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

function formatConnectionLabel(status: string) {
  switch (status) {
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
  if (key === "bestPractices") {
    return "Best Practices";
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function PassedCheckCard({ check }: { check: AuditReportCheck }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <CircleCheckBig className="h-4 w-4 text-emerald-600" />
        <p className="font-semibold text-foreground">
          {check.label ?? "Passed check"}
        </p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
          Passed
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-foreground/70">
        {check.detail && (
          <p>
            <span className="font-semibold text-foreground/80">
              What is working:
            </span>{" "}
            {check.detail}
          </p>
        )}
        {check.selector && (
          <p>
            <span className="font-semibold text-foreground/80">
              Page area:
            </span>{" "}
            <code className="rounded bg-white px-2 py-1 text-xs">
              {check.selector}
            </code>
          </p>
        )}
        {check.metric && (
          <p>
            <span className="font-semibold text-foreground/80">Metric:</span>{" "}
            {check.metric}
          </p>
        )}
      </div>
    </div>
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

  const jobId = useAuditStore((state) => state.jobId);
  const targetUrl = useAuditStore((state) => state.targetUrl);
  const reportUrl = useAuditStore((state) => state.reportUrl);
  const status = useAuditStore((state) => state.status);
  const connectionStatus = useAuditStore((state) => state.connectionStatus);
  const events = useAuditStore((state) => state.events);
  const liveError = useAuditStore((state) => state.error);
  const primeAudit = useAuditStore((state) => state.primeAudit);
  const connectToStream = useAuditStore((state) => state.connectToStream);
  const markVerified = useAuditStore((state) => state.markVerified);
  const reset = useAuditStore((state) => state.reset);

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
  const isAuditSettled = Boolean(report) || status === "FAILED";
  const isAuditActive = Boolean(jobId) && !isAuditSettled;
  const categoryScores = report?.categories
    ? Object.entries(report.categories).map(([key, value]) => ({
        key,
        label: formatCategoryLabel(key),
        score: typeof value === "number" ? value : 0,
      }))
    : [];
  const userFacingError =
    actionState.error ||
    liveError ||
    (reportQuery.error instanceof Error &&
    !(reportQuery.error instanceof ReportPendingError)
      ? reportQuery.error.message
      : null);

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
    <div className="w-full">
      <form action={formAction} className="mx-auto mt-12 w-full max-w-4xl">
        <div className="group relative flex flex-col rounded-2xl border border-border bg-white p-2 shadow-2xl shadow-black/5 transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            type="text"
            name="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isPending || isAuditActive}
            placeholder="Enter your website URL (e.g., myshop.com)"
            className="h-14 min-w-0 w-full bg-transparent px-4 text-base outline-none placeholder:text-sm placeholder:text-foreground/30 sm:px-6 sm:text-lg sm:placeholder:text-base"
          />
          <button
            type="submit"
            disabled={isPending || isAuditActive}
            className="mt-2 flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:scale-100 sm:mt-0 sm:min-w-[220px] sm:w-auto sm:px-8 sm:text-lg"
          >
            {isPending ? (
              <>
                <RotateCcw className="h-5 w-5 animate-spin" />
                Starting your audit...
              </>
            ) : isAuditActive ? (
              <>
                <RotateCcw className="h-5 w-5 animate-spin" />
                Audit in progress
              </>
            ) : (
              <>
                Start Audit
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-foreground/50">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-primary">
            Instant start
          </span>
          <span className="h-1 w-1 rounded-full bg-foreground/10" />
          <span>Live updates</span>
          <span className="h-1 w-1 rounded-full bg-foreground/10" />
          <span>Clear action plan</span>
        </div>
      </form>

      <AnimatePresence initial={false}>
        {(jobId || isPending || userFacingError) && (
          <motion.div
            ref={resultPanelRef}
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="mt-16 overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
          >
            <div className="grid gap-0 md:grid-cols-[1.35fr_0.85fr]">
              <div className="p-8 md:p-12">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-foreground/60">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        status === "FAILED"
                          ? "bg-rose-500"
                          : status === "VERIFIED"
                            ? "bg-emerald-500"
                            : "animate-pulse bg-primary"
                      }`}
                    />
                    {formatStatusLabel(status, isPending)}
                  </span>
                  <span className="text-sm text-foreground/45">
                    {targetUrl || actionState.targetUrl || "Preparing your audit"}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-3 text-foreground/70">
                  {report ? (
                    <>
                      <BadgeCheck className="h-5 w-5 text-emerald-500" />
                      <p className="text-lg font-semibold">
                        Your results are ready
                      </p>
                    </>
                  ) : pendingReport ? (
                    <>
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold">
                        Finalizing your results
                      </p>
                    </>
                  ) : (
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
                      <div className="rounded-2xl border border-dashed border-border px-5 py-6 text-sm text-foreground/50">
                        Getting your first results ready...
                      </div>
                    ) : (
                      events.map((event) => (
                        <div
                          key={String(event.eventId)}
                          className={`rounded-2xl border px-5 py-4 ${
                            isPassedCheck(event.checkStatus)
                              ? "border-emerald-200 bg-emerald-50/70"
                              : "border-border/70 bg-secondary/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <CheckCircle2
                              className={`h-5 w-5 ${
                                isIssueCheck(event.checkStatus)
                                  ? "text-primary"
                                  : isPassedCheck(event.checkStatus)
                                    ? "text-emerald-500"
                                    : event.type === "complete"
                                    ? "text-emerald-500"
                                    : "text-foreground/40"
                              }`}
                            />
                            <span className="text-sm font-semibold text-foreground/80">
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
                            <span className="ml-auto text-xs text-foreground/40">
                              {formatTimestamp(
                                typeof event.timestamp === "string"
                                  ? event.timestamp
                                  : undefined
                              )}
                            </span>
                          </div>

                          {(event.selector || renderEventDetail(event)) && (
                            <details className="mt-3 rounded-xl bg-white/80 px-4 py-3 text-sm text-foreground/70">
                              <summary className="cursor-pointer list-none font-semibold text-foreground/75">
                                {isPassedCheck(event.checkStatus) ? "Why this passed" : "Suggested fix"}
                              </summary>
                              <div className="mt-3 space-y-2">
                                {typeof event.selector === "string" && (
                                  <p>
                                    <span className="font-semibold text-foreground/80">
                                      Page area:
                                    </span>{" "}
                                    <code className="rounded bg-secondary px-2 py-1 text-xs">
                                      {event.selector}
                                    </code>
                                  </p>
                                )}
                                {renderEventDetail(event) && (
                                  <p>
                                    <span className="font-semibold text-foreground/80">
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
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Top priority
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {report.summary?.topIssue ?? "Your audit results are ready"}
                          </p>
                        </div>
                        {hasVerifiedSignature && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                            <BadgeCheck className="h-4 w-4" />
                            Ready
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-secondary/20 px-5 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
                          Visibility Score
                        </div>
                        <div className="mt-3 text-5xl font-black text-primary">
                          {reportScore}
                          <span className="text-xl text-foreground/20">/100</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/20 px-5 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
                          Issues found
                        </div>
                        <div className="mt-3 text-5xl font-black text-primary">
                          {issueCount}
                        </div>
                        <p className="mt-2 text-xs text-foreground/45">
                          Action items we recommend prioritizing first.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                          Passed checks
                        </div>
                        <div className="mt-3 text-5xl font-black text-emerald-600">
                          {passedCheckCount}
                        </div>
                        <p className="mt-2 text-xs text-emerald-700/70">
                          Signals that are already working in your favor.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/20 px-5 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
                          Review status
                        </div>
                        <div className="mt-3 text-sm font-medium text-foreground/75">
                          {hasVerifiedSignature ? "Checked" : "In progress"}
                        </div>
                        <p className="mt-2 text-xs text-foreground/45">
                          {hasVerifiedSignature
                            ? "Your results are ready to explore."
                            : "We're still preparing your results."}
                        </p>
                      </div>
                    </div>

                    {categoryScores.length > 0 && (
                      <div className="rounded-3xl border border-border bg-white px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/45">
                            Score breakdown
                          </h3>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {categoryScores.map((category) => (
                            <div
                              key={category.key}
                              className={`rounded-2xl px-4 py-4 ring-1 ${categoryTone(category.score)}`}
                            >
                              <div className="text-sm font-semibold">{category.label}</div>
                              <div className="mt-2 text-3xl font-black">
                                {category.score}
                                <span className="text-sm font-semibold opacity-60">/100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Recommended fixes
                            </h3>
                            <p className="text-sm text-foreground/55">
                              Start here to improve visibility the fastest.
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                            {issueCount} issues
                          </span>
                        </div>

                        {reportFindings.length === 0 ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-800">
                            No urgent issues were flagged in this audit. Your site cleared every tracked check in this slice.
                          </div>
                        ) : (
                          reportFindings.map((finding, index) => (
                            <div
                              key={finding.id ?? `${finding.selector}-${index}`}
                              className="rounded-2xl border border-border px-5 py-4"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <ChevronRight className="h-4 w-4 text-primary" />
                                <p className="font-semibold text-foreground">
                                  {finding.label ?? "Finding"}
                                </p>
                                {finding.severity && (
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${severityTone(
                                      finding.severity
                                    )}`}
                                  >
                                    {finding.severity}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 space-y-2 text-sm text-foreground/70">
                                {finding.instruction && (
                                  <p>
                                    <span className="font-semibold text-foreground/80">
                                      Recommended fix:
                                    </span>{" "}
                                    {finding.instruction}
                                  </p>
                                )}
                                {finding.selector && (
                                  <p>
                                    <span className="font-semibold text-foreground/80">
                                      Page area:
                                    </span>{" "}
                                    <code className="rounded bg-secondary px-2 py-1 text-xs">
                                      {finding.selector}
                                    </code>
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Checks you already pass
                            </h3>
                            <p className="text-sm text-foreground/55">
                              Keep these stable while you work through the fixes.
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                            {passedCheckCount} passed
                          </span>
                        </div>

                        {reportPassedChecks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border px-5 py-5 text-sm text-foreground/55">
                            We did not capture any confirmed passed checks for this run.
                          </div>
                        ) : (
                          reportPassedChecks.map((check, index) => (
                            <PassedCheckCard
                              key={check.id ?? `${check.selector}-${index}`}
                              check={check}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-secondary/20 p-8 md:border-t-0 md:border-l">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <div className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/40">
                    Progress
                  </div>
                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Live updates
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {formatConnectionLabel(connectionStatus)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Website
                      </div>
                      <div className="mt-2 break-all text-sm text-foreground/70">
                        {targetUrl || actionState.targetUrl || "Waiting"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Issues found
                      </div>
                      <div className="mt-2 text-4xl font-black text-primary">
                        {report ? issueCount : liveFindings.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Checks passed
                      </div>
                      <div className="mt-2 text-4xl font-black text-emerald-600">
                        {report ? passedCheckCount : livePassedChecks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Progress
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{
                            width: `${report ? 100 : currentProgress}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-sm text-foreground/60">
                        {report ? "Ready" : `${currentProgress}%`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/35">
                        Current step
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
                        {pendingReport ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                            Putting the final touches on your results
                          </>
                        ) : report ? (
                          <>
                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                            Your results are ready
                          </>
                        ) : (
                          <>
                            <Radar className="h-4 w-4 text-primary" />
                            Checking your site
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
                    className="mt-6 w-full rounded-2xl border border-primary/20 bg-white px-5 py-4 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/5"
                  >
                    Run another audit
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
