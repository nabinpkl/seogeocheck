import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { EmptyPanelState, SectionEyebrow, SeverityBadge, SurfaceCard } from "./primitives";
import type { AuditStreamRowModel } from "../types/models";

const rowToneClasses = {
  error: "border-rose-100 bg-rose-50/30",
  issue: "border-slate-100 bg-slate-50",
  passed: "border-emerald-100 bg-emerald-50/30",
  not_applicable: "border-slate-200 bg-slate-50/70",
  system_error: "border-amber-200 bg-amber-50/40",
  complete: "border-emerald-100 bg-emerald-50/30",
  neutral: "border-slate-100 bg-slate-50",
};

const iconToneClasses = {
  error: "text-rose-500",
  issue: "text-primary",
  passed: "text-emerald-500",
  not_applicable: "text-slate-500",
  system_error: "text-amber-600",
  complete: "text-emerald-500",
  neutral: "text-slate-400",
};

export function AuditLiveStreamPanel({
  rows,
}: {
  rows: AuditStreamRowModel[];
}) {
  return (
    <SurfaceCard>
      <SectionEyebrow className="mb-2">Recent Activity</SectionEyebrow>
      <p className="mb-6 text-sm leading-6 text-slate-500">
        Live events appear here as the audit advances. The newest updates stay at the top.
      </p>
      {rows.length === 0 ? (
        <EmptyPanelState>
          Waiting for the first live audit update...
        </EmptyPanelState>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-2xl border px-5 py-4 ${rowToneClasses[row.state]}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <CheckCircle2 className={`h-5 w-5 ${iconToneClasses[row.state]}`} />
                <span className="break-all whitespace-pre-wrap text-sm font-semibold text-slate-700">
                  {row.title}
                </span>
                {row.severityLabel ? (
                  <SeverityBadge tone={row.tone}>{row.severityLabel}</SeverityBadge>
                ) : null}
                <span className="ml-auto text-xs text-slate-400">{row.timestampLabel}</span>
              </div>

              {(row.selector || row.messageSections.length > 0) ? (
                <details className="mt-3 rounded-xl border border-slate-100 bg-white/50 px-4 py-3 text-left text-sm text-slate-600">
                  <summary className="cursor-pointer list-none font-semibold text-slate-700">
                    View details
                  </summary>
                  <div className="mt-3 space-y-2">
                    {row.selector ? (
                      <p>
                        <span className="font-semibold text-slate-700">Page area:</span>{" "}
                        <code className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                          {row.selector}
                        </code>
                      </p>
                    ) : null}
                    {row.messageSections.map((section) => (
                      <p key={section.label}>
                        <span className="font-semibold text-slate-700">{section.label}:</span>{" "}
                        {section.body}
                      </p>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
