import * as React from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "./primitives";

type AuditScoreHeroProps = {
  reportScore: number;
  scoreConfidence: number | null;
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  onScrollToIssues: () => void;
  onScrollToFamilies: () => void;
};

/* ── tone helpers ───────────────────────────────────────── */

const dotColors = {
  critical: "bg-rose-500",
  success: "bg-emerald-500",
  neutral: "bg-slate-300",
  warning: "bg-amber-500",
} as const;

const numberColors = {
  critical: "text-rose-600",
  success: "text-emerald-600",
  neutral: "text-slate-500",
  warning: "text-amber-600",
} as const;

function formatScoreLabel(tone: "success" | "info" | "critical") {
  if (tone === "success") return "Strong Footing";
  if (tone === "info") return "Room to Grow";
  return "Needs Attention";
}

function resolveHeroTone(
  reportScore: number,
  scoreConfidence: number | null
): "success" | "info" | "critical" | "neutral" {
  if (scoreConfidence === 0) {
    return "neutral";
  }

  if (reportScore > 70) return "success";
  if (reportScore > 40) return "info";
  return "critical";
}

function buildOutcomeHeadline(args: {
  issueCount: number;
  passedCheckCount: number;
  systemErrorCount: number;
  totalCheckCount: number;
}) {
  const { issueCount, passedCheckCount, systemErrorCount, totalCheckCount } = args;

  if (totalCheckCount === 0) return "No checks were returned for this page.";
  if (issueCount > 0) return "Fix a few signals to get this page fully dialed in.";
  if (systemErrorCount > 0) return "No issues flagged — a few checks still need a second look.";
  if (passedCheckCount > 0) return "Looking clean. Core signals are healthy.";
  return "Audit complete — no issues found.";
}

/* ── component ──────────────────────────────────────────── */

export function AuditScoreHero({
  reportScore,
  scoreConfidence,
  issueCount,
  passedCheckCount,
  notApplicableCount,
  systemErrorCount,
  onScrollToIssues,
  onScrollToFamilies,
}: AuditScoreHeroProps) {
  const tone = resolveHeroTone(reportScore, scoreConfidence);
  const totalCheckCount =
    issueCount + passedCheckCount + notApplicableCount + systemErrorCount;
  const headline = buildOutcomeHeadline({
    issueCount,
    passedCheckCount,
    systemErrorCount,
    totalCheckCount,
  });

  const strokeClassName =
    tone === "success"
      ? "text-emerald-500"
      : tone === "info"
        ? "text-primary"
        : tone === "neutral"
          ? "text-slate-400"
        : "text-rose-500";
  const toneLabelColor =
    tone === "success"
      ? "text-emerald-600"
      : tone === "info"
        ? "text-primary"
        : tone === "neutral"
          ? "text-slate-500"
        : "text-rose-600";

  const circumference = 2 * Math.PI * 54;

  const stats = [
    { label: "needs action", count: issueCount, tone: "critical" as const },
    { label: "passing", count: passedCheckCount, tone: "success" as const },
    { label: "skipped", count: notApplicableCount, tone: "neutral" as const },
    { label: "couldn't run", count: systemErrorCount, tone: "warning" as const },
  ].filter((s) => s.count > 0);
  const toneLabel = tone === "neutral" ? "Unverified" : formatScoreLabel(tone);

  return (
    <SurfaceCard className="group/hub relative overflow-hidden p-0">

      <div className="relative p-6 md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">

          {/* ── Score ring ────────────────────────────────── */}
          <div className="flex shrink-0 flex-col items-center text-center">
            <div className="group/score relative flex h-32 w-32 items-center justify-center font-mono md:h-36 md:w-36">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60" cy="60" r="54"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-100"
                />
                <circle
                  cx="60" cy="60" r="54"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - reportScore / 100)}
                  className={cn(strokeClassName, "transition-all duration-1000 ease-out")}
                  strokeLinecap="round"
                />
              </svg>

              {/* Number + /100 — both INSIDE the ring */}
              <div className="flex flex-col items-center leading-none transition-transform duration-300 group-hover/score:scale-105">
                <span className="text-5xl font-black tracking-tighter text-slate-900 md:text-[3.5rem]">
                  {reportScore}
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-[0.15em] text-slate-400">
                  / 100
                </span>
              </div>
            </div>

            {/* Tone label + check count — below the ring */}
            <span className={cn("mt-2.5 text-xs font-bold tracking-wide", toneLabelColor)}>
              {toneLabel}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400">
              {totalCheckCount} checks evaluated
            </span>
          </div>

          {/* ── Content column ────────────────────────────── */}
          <div className="min-w-0 flex-1 flex flex-col items-start gap-4">
            {/* Headline */}
            <h3 className="text-left text-2xl font-black leading-snug tracking-tight text-slate-950 md:text-3xl">
              {headline}
            </h3>

            {/* Stat strip — flat inline text, clearly data not buttons */}
            {stats.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {stats.map((stat) => (
                  <span key={stat.label} className="flex items-center gap-1.5">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", dotColors[stat.tone])}
                    />
                    <span
                      className={cn(
                        "font-mono text-sm font-black tabular-nums",
                        numberColors[stat.tone]
                      )}
                    >
                      {stat.count}
                    </span>
                    <span className="text-sm text-slate-500">
                      {stat.label}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}

            {/* CTA row — soft background, clearly interactive */}
            <div className="flex items-center gap-3">
              {issueCount > 0 ? (
                <>
                  <Button
                    type="button"
                    onClick={onScrollToIssues}
                    className="h-9 gap-1.5 rounded-xl border border-rose-200/60 bg-rose-50 px-4 text-sm font-bold text-rose-600 shadow-none hover:bg-rose-100 active:scale-[0.98]"
                  >
                    Review flagged checks
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <button
                    type="button"
                    onClick={onScrollToFamilies}
                    className="group/link flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                  >
                    Full checklist
                    <ChevronRight className="size-3 text-slate-300 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-slate-500" />
                  </button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={onScrollToFamilies}
                  className="h-9 gap-1.5 rounded-xl border border-primary/15 bg-primary/5 px-4 text-sm font-bold text-primary shadow-none hover:bg-primary/10 active:scale-[0.98]"
                >
                  Open full checklist
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
