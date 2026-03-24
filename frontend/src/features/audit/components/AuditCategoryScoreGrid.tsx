import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionEyebrow, SurfaceCard } from "./primitives";
import type { AuditCategoryScoreModel } from "../types/models";

const scoreToneClasses = {
  success: "text-emerald-600 bg-emerald-500 border-emerald-500",
  info: "text-primary bg-primary border-primary",
  critical: "text-rose-600 bg-rose-500 border-rose-500",
  neutral: "text-slate-600 bg-slate-500 border-slate-500",
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
      <div className="mb-8 flex items-center gap-4">
        <SectionEyebrow className="tracking-[0.4em]">Technical Scores</SectionEyebrow>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const toneKey =
            category.tone === "success"
              ? "success"
              : category.tone === "critical"
                ? "critical"
                : category.tone === "info"
                  ? "info"
                  : "neutral";

          return (
            <div
              key={category.key}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30 p-5 transition-all hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{category.label}</span>
                <span className={cn("text-sm font-black font-mono", scoreToneClasses[toneKey].split(" ")[0])}>
                  {category.score}
                </span>
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full border border-slate-100 bg-white">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    scoreToneClasses[toneKey].split(" ")[1]
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
