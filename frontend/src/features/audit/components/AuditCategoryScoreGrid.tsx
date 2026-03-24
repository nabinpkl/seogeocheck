import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionEyebrow, SurfaceCard } from "./primitives";
import type { AuditCategoryScoreModel } from "../types/models";

const scoreToneClasses = {
  success: {
    text: "text-emerald-600",
    bar: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  info: {
    text: "text-primary",
    bar: "bg-primary",
    glow: "shadow-primary/20",
  },
  critical: {
    text: "text-rose-600",
    bar: "bg-rose-500",
    glow: "shadow-rose-500/20",
  },
  neutral: {
    text: "text-slate-500",
    bar: "bg-slate-400",
    glow: "shadow-slate-400/20",
  },
};

export function AuditCategoryScoreGrid({
  categories,
}: {
  categories: AuditCategoryScoreModel[];
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <SurfaceCard>
      <div className="mb-6 flex items-center gap-4">
        <SectionEyebrow className="tracking-[0.4em]">
          Technical Scores
        </SectionEyebrow>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const toneKey =
            category.tone === "success"
              ? "success"
              : category.tone === "critical"
                ? "critical"
                : category.tone === "info"
                  ? "info"
                  : "neutral";

          const toneStyles = scoreToneClasses[toneKey];

          return (
            <div
              key={category.key}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30 p-5 transition-all duration-200 hover:border-slate-200/80 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">
                  {category.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-lg font-black tabular-nums transition-transform duration-200 group-hover:scale-110",
                    toneStyles.text
                  )}
                >
                  {category.score}
                </span>
              </div>
              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    toneStyles.bar
                  )}
                  style={{ width: `${category.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
