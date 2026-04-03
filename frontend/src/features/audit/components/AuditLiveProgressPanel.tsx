import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MetaLabel, SectionEyebrow, StatusPill, SurfaceCard } from "./primitives";

type AuditLiveProgressPanelProps = {
  phaseLabel: string;
  phaseDetail: string;
  gapsCount: number;
  signalsCount: number;
  progressValue: number;
  progressLabel: string;
  progressBarClassName: string;
  liveScoreState: "waiting" | "provisional" | "final";
  liveScoreValue: number | null;
  evaluatedChecksCount: number;
  showLiveMetrics: boolean;
  operationState: "failed" | "pending" | "ready" | "active";
};

function resolveOperationCopy(operationState: AuditLiveProgressPanelProps["operationState"]) {
  switch (operationState) {
    case "failed":
      return { label: "Needs Attention", tone: "critical" as const };
    case "pending":
      return { label: "Finalizing", tone: "pending" as const };
    case "ready":
      return { label: "Ready", tone: "success" as const };
    default:
      return { label: "Live", tone: "info" as const };
  }
}

export function AuditLiveProgressPanel({
  phaseLabel,
  phaseDetail,
  gapsCount,
  signalsCount,
  progressValue,
  progressLabel,
  progressBarClassName,
  liveScoreState,
  liveScoreValue,
  evaluatedChecksCount,
  showLiveMetrics,
  operationState,
}: AuditLiveProgressPanelProps) {
  const operationCopy = resolveOperationCopy(operationState);
  const circumference = 2 * Math.PI * 44;
  const scoreStrokeOffset =
    liveScoreValue === null ? circumference : circumference * (1 - liveScoreValue / 100);

  return (
    <SurfaceCard className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <SectionEyebrow>Audit Progress</SectionEyebrow>
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-slate-950">
              {phaseLabel}
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {phaseDetail}
            </p>
          </div>
        </div>

        <StatusPill
          tone={operationCopy.tone}
          pulse={operationState === "active" || operationState === "pending"}
        >
          {operationCopy.label}
        </StatusPill>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <MetaLabel>Progress</MetaLabel>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {progressLabel}
          </span>
        </div>
        <Progress
          value={progressValue}
          className="h-3 bg-slate-100"
          indicatorClassName={cn("rounded-full transition-all duration-500", progressBarClassName)}
        />
      </div>

      <div className={cn("grid gap-4", showLiveMetrics ? "lg:grid-cols-[280px_1fr]" : "grid-cols-1")}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <MetaLabel className="mb-4">Live Score</MetaLabel>

          {liveScoreState === "waiting" ? (
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200"
                  />
                </svg>
                <LoaderCircle className="absolute h-5 w-5 animate-spin text-slate-400" />
              </div>

              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900">Waiting for score data</div>
                <p className="text-sm leading-6 text-slate-500">
                  We will start estimating once the first scored signals arrive.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center font-mono">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={scoreStrokeOffset}
                    className="text-primary transition-all duration-700 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="relative flex flex-col items-center leading-none">
                  <span className="text-3xl font-black text-slate-950">
                    {liveScoreValue}
                  </span>
                  <span className="mt-1 text-[9px] font-bold tracking-[0.18em] text-slate-400">
                    / 100
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900">
                  {liveScoreState === "final" ? "Final score" : "Provisional live score"}
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  {liveScoreState === "final"
                    ? "The final report is ready and the final score is locked in."
                    : evaluatedChecksCount === 1
                      ? "Based on the first scored signal. This will keep adjusting as more checks finish."
                      : `Based on ${evaluatedChecksCount} scored signals so far. This will keep adjusting as more checks finish.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {showLiveMetrics ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <MetaLabel className="text-rose-500">Gaps</MetaLabel>
              <div className="mt-3 text-4xl font-black text-rose-600">{gapsCount}</div>
              <p className="mt-2 text-sm text-rose-700">
                Checks that already need action.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <MetaLabel className="text-emerald-500">Signals</MetaLabel>
              <div className="mt-3 text-4xl font-black text-emerald-600">{signalsCount}</div>
              <p className="mt-2 text-sm text-emerald-700">
                Checks that are already passing.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
