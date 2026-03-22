import * as React from "react";
import { ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceTag, SeverityBadge } from "./primitives";
import type { AuditCheckRowModel } from "./models";

const rowToneClasses = {
  issue: {
    critical: "border-rose-200 bg-rose-50/40 hover:bg-rose-50/60",
    warning: "border-amber-200 bg-amber-50/40 hover:bg-amber-50/60",
    info: "border-blue-200/50 bg-blue-50/30 hover:bg-blue-50/50",
  },
  passed: "border-emerald-500/10 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05]",
};

const iconToneClasses = {
  critical: "text-rose-600",
  warning: "text-amber-600",
  info: "text-blue-600",
  success: "text-emerald-500",
};

export function AuditCheckRow({ model }: { model: AuditCheckRowModel }) {
  const isIssue = model.kind === "issue";
  const rowToneClass = isIssue
    ? rowToneClasses.issue[
        model.tone === "critical"
          ? "critical"
          : model.tone === "warning"
            ? "warning"
            : "info"
      ]
    : rowToneClasses.passed;
  const iconToneClass = isIssue
    ? iconToneClasses[
        model.tone === "critical"
          ? "critical"
          : model.tone === "warning"
            ? "warning"
            : "info"
      ]
    : iconToneClasses.success;

  const statusIcon = model.kind === "passed" ? (
    <CheckCircle2 className="h-4 w-4" />
  ) : model.tone === "critical" ? (
    <AlertCircle className="h-4 w-4" />
  ) : model.tone === "warning" ? (
    <AlertTriangle className="h-4 w-4" />
  ) : (
    <Info className="h-4 w-4" />
  );

  return (
    <details
      open={model.isHero}
      className={cn(
        "group/row overflow-hidden rounded-2xl border transition-all",
        rowToneClass
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-left">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center transition-all",
            iconToneClass
          )}
        >
          {statusIcon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-tight text-slate-900">
            {model.title}
          </div>
          {model.evidenceSourceLabel ? (
            <EvidenceTag>{model.evidenceSourceLabel}</EvidenceTag>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {model.severityLabel ? (
            <SeverityBadge
              tone={
                model.kind === "passed"
                  ? "success"
                  : model.tone === "critical"
                    ? "critical"
                    : model.tone === "warning"
                      ? "warning"
                      : "info"
              }
              className={cn(model.isHero && "tracking-[0.2em] shadow-sm")}
            >
              {model.severityLabel}
            </SeverityBadge>
          ) : null}
          <ChevronRight className="h-4 w-4 text-slate-400 transition group-open/row:rotate-90" />
        </div>
      </summary>

      <div
        className={cn(
          "border-t border-slate-100 px-5 py-4 text-left text-sm",
          isIssue ? "text-slate-600" : "text-emerald-700"
        )}
      >
        <div className="space-y-2">
          {model.summaryLabel && model.summary ? (
            <p>
              <span className="font-bold text-slate-900">{model.summaryLabel}:</span>{" "}
              {model.summary}
            </p>
          ) : null}
          {model.selector ? (
            <p>
              <span className="font-bold text-slate-900">Page area:</span>{" "}
              <code className="break-all whitespace-pre-wrap rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                {model.selector}
              </code>
            </p>
          ) : null}
          {model.metric ? (
            <p>
              <span className="font-semibold text-slate-900">Metric:</span> {model.metric}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
