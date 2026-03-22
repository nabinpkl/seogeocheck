import * as React from "react";
import { cn } from "@/lib/utils";

type AuditScoreHeroProps = {
  reportScore: number;
  issueCount: number;
  passedCheckCount: number;
  onScrollToIssues: () => void;
  onScrollToFamilies: () => void;
};

export function AuditScoreHero({
  reportScore,
  issueCount,
  passedCheckCount,
  onScrollToIssues,
  onScrollToFamilies,
}: AuditScoreHeroProps) {
  void onScrollToFamilies;

  const tone =
    reportScore > 70 ? "success" : reportScore > 40 ? "info" : "critical";

  const strokeClassName =
    tone === "success"
      ? "text-emerald-500"
      : tone === "info"
        ? "text-primary"
        : "text-rose-500";
  const label =
    tone === "success"
      ? "High Visibility"
      : tone === "info"
        ? "Moderate Reach"
        : "Optimizing Visibility";

  return (
    <div className="group/hub relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm md:p-12 lg:p-14">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50/50" />
      </div>

      <div className="relative flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-16 xl:gap-24">
        <div className="flex flex-col items-center">
          <div className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Visibility Score <span className="tracking-widest">(%)</span>
          </div>

          <div className="group/score relative flex h-44 w-44 items-center justify-center font-mono">
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
              <span className="text-6xl font-black tracking-tighter text-slate-900">
                {reportScore}
              </span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                /100
              </span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 shadow-sm">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                tone === "success"
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : tone === "info"
                    ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
              {label}
            </span>
          </div>
        </div>

        <div className="hidden h-32 w-px bg-slate-200 lg:block" />

        <div className="flex items-center gap-12 sm:gap-20 lg:gap-16 xl:gap-24">
          <button
            type="button"
            onClick={onScrollToIssues}
            className="group/stat flex cursor-pointer flex-col items-center text-left transition-transform hover:scale-105 lg:items-start"
          >
            <div className="font-mono text-6xl font-black leading-none tracking-tighter text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.1)] lg:text-7xl">
              {issueCount}
            </div>
            <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Things need your attention
            </div>
            <div className="mt-4 h-0.5 w-8 bg-rose-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-rose-500" />
          </button>

          <button
            type="button"
            className="group/stat flex cursor-default! flex-col items-center text-left transition-transform hover:scale-105 lg:items-start"
          >
            <div className="font-mono text-6xl font-black leading-none tracking-tighter text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.1)] lg:text-7xl">
              {passedCheckCount}
            </div>
            <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Checks Passed
            </div>
            <div className="mt-4 h-0.5 w-8 bg-emerald-500/20 transition-all group-hover/stat:w-full group-hover/stat:bg-emerald-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
