import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionEyebrow, StatusPill, SurfaceCard } from "./primitives";

type AuditScoreHeroProps = {
  reportScore: number;
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  onScrollToIssues: () => void;
  onScrollToFamilies: () => void;
};

const breakdownToneClasses = {
  critical: {
    card: "border-rose-200 bg-rose-50/70",
    number: "text-rose-600",
    dot: "bg-rose-500",
  },
  success: {
    card: "border-emerald-200 bg-emerald-50/70",
    number: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  neutral: {
    card: "border-slate-200 bg-slate-50/80",
    number: "text-slate-700",
    dot: "bg-slate-400",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/80",
    number: "text-amber-600",
    dot: "bg-amber-500",
  },
} as const;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function formatScoreLabel(tone: "success" | "info" | "critical") {
  if (tone === "success") {
    return "Strong Footing";
  }

  if (tone === "info") {
    return "Room To Grow";
  }

  return "Needs Attention";
}

function buildOutcomeHeadline(args: {
  issueCount: number;
  passedCheckCount: number;
  systemErrorCount: number;
  totalCheckCount: number;
}) {
  const { issueCount, passedCheckCount, systemErrorCount, totalCheckCount } = args;

  if (totalCheckCount === 0) {
    return "No tracked checks were returned in this report.";
  }

  if (issueCount > 0) {
    return `${issueCount} ${pluralize(issueCount, "check")} need action before this page is fully dialed in.`;
  }

  if (systemErrorCount > 0) {
    return `No issues were flagged, but ${systemErrorCount} ${pluralize(systemErrorCount, "check")} still need review.`;
  }

  if (passedCheckCount > 0) {
    return `Core signals look healthy across this audit.`;
  }

  return "This audit finished without any flagged issues.";
}

function buildOutcomeSummary(args: {
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  totalCheckCount: number;
}) {
  const {
    issueCount,
    passedCheckCount,
    notApplicableCount,
    systemErrorCount,
    totalCheckCount,
  } = args;

  if (totalCheckCount === 0) {
    return "Run the audit again to refresh the technical breakdown for this page.";
  }

  const parts: string[] = [];

  if (passedCheckCount > 0) {
    parts.push(`${passedCheckCount} ${pluralize(passedCheckCount, "check")} passed`);
  }

  if (notApplicableCount > 0) {
    parts.push(
      `${notApplicableCount} ${pluralize(notApplicableCount, "check")} ${notApplicableCount === 1 ? "was" : "were"} not relevant for this page`
    );
  }

  if (systemErrorCount > 0) {
    parts.push(
      `${systemErrorCount} ${pluralize(systemErrorCount, "check")} still need manual review`
    );
  }

  if (parts.length === 0) {
    return issueCount > 0
      ? `This run reviewed ${totalCheckCount} tracked checks, and every reviewed check surfaced a fix to work through.`
      : `This run reviewed ${totalCheckCount} tracked checks with no additional detail to summarize.`;
  }

  if (issueCount === 0) {
    return `This run reviewed ${totalCheckCount} tracked checks. ${parts.join(", ")}.`;
  }

  return `This run reviewed ${totalCheckCount} tracked checks. Alongside the flagged items, ${parts.join(", ")}.`;
}

export function AuditScoreHero({
  reportScore,
  issueCount,
  passedCheckCount,
  notApplicableCount,
  systemErrorCount,
  onScrollToIssues,
  onScrollToFamilies,
}: AuditScoreHeroProps) {
  const tone =
    reportScore > 70 ? "success" : reportScore > 40 ? "info" : "critical";
  const totalCheckCount =
    issueCount + passedCheckCount + notApplicableCount + systemErrorCount;
  const headline = buildOutcomeHeadline({
    issueCount,
    passedCheckCount,
    systemErrorCount,
    totalCheckCount,
  });
  const summary = buildOutcomeSummary({
    issueCount,
    passedCheckCount,
    notApplicableCount,
    systemErrorCount,
    totalCheckCount,
  });
  const primaryActionLabel =
    issueCount > 0 ? "Review flagged checks" : "Open full checklist";
  const primaryAction = issueCount > 0 ? onScrollToIssues : onScrollToFamilies;
  const breakdownCards = [
    {
      label: "Needs action",
      count: issueCount,
      helper:
        issueCount > 0
          ? "Prioritize these fixes first."
          : "No flagged checks in this run.",
      tone: "critical" as const,
    },
    {
      label: "Passing",
      count: passedCheckCount,
      helper:
        passedCheckCount > 0
          ? "Already in good shape."
          : "No checks cleared yet.",
      tone: "success" as const,
    },
    {
      label: "Skipped",
      count: notApplicableCount,
      helper:
        notApplicableCount > 0
          ? "These checks were not evaluated."
          : "All tracked checks applied.",
      tone: "neutral" as const,
    },
    {
      label: "Couldn't Perform",
      count: systemErrorCount,
      helper:
        systemErrorCount > 0
          ? "We couldn't perform these checks."
          : "All checks were performed.",
      tone: "warning" as const,
    },
  ];

  const strokeClassName =
    tone === "success"
      ? "text-emerald-500"
      : tone === "info"
        ? "text-primary"
        : "text-rose-500";

  return (
    <SurfaceCard className="group/hub relative overflow-hidden p-0">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/80" />
        <div className="absolute -left-12 top-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative grid gap-10 p-8 md:p-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-12">
        <div className="flex flex-col items-center border-b border-slate-200/80 pb-10 text-center lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
          <SectionEyebrow className="mb-6 text-slate-500">
            Visibility Score <span className="tracking-widest">(%)</span>
          </SectionEyebrow>

          <div className="group/score relative flex h-40 w-40 items-center justify-center font-mono md:h-48 md:w-48">
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-100"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - reportScore / 100)}
                className={cn(strokeClassName, "transition-all duration-1000 ease-out")}
                strokeLinecap="round"
              />
            </svg>

            <div className="flex flex-col items-center leading-none transition-transform duration-300 group-hover/score:scale-110">
              <span className="text-6xl font-black tracking-tighter text-slate-900 md:text-7xl">
                {reportScore}
              </span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                /100
              </span>
            </div>
          </div>

          <StatusPill
            tone={tone === "info" ? "info" : tone}
            className="mt-8 border-white/70 bg-white/90 text-slate-700 shadow-sm"
          >
            {formatScoreLabel(tone)}
          </StatusPill>

          <p className="mt-4 max-w-[18rem] text-sm leading-6 text-slate-500">
            Based on {totalCheckCount} tracked {pluralize(totalCheckCount, "check")} in
            this audit run.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <SectionEyebrow className="text-slate-500">
              Mission Control Snapshot
            </SectionEyebrow>
            <h3 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {headline}
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              {summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {breakdownCards.map((card) => (
              card.count > 0 && (
              <div
                key={card.label}
                className={cn(
                  "rounded-3xl border p-5 shadow-sm shadow-slate-200/40",
                  breakdownToneClasses[card.tone].card
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                    {card.label}
                  </p>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      breakdownToneClasses[card.tone].dot
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "mt-5 font-mono text-4xl font-black tracking-tighter md:text-5xl",
                    breakdownToneClasses[card.tone].number
                  )}
                >
                  {card.count}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.helper}</p>
              </div>
            )))}
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-200/40 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Audit Coverage
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the flagged checks for quick wins, then review the full checklist for
                everything that passed, was not relevant, or still needs review.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                className="min-w-[200px]"
                onClick={primaryAction}
              >
                {primaryActionLabel}
                <ArrowRight className="size-4" />
              </Button>
              {issueCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-w-[180px] bg-white/80"
                  onClick={onScrollToFamilies}
                >
                  Open full checklist
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
