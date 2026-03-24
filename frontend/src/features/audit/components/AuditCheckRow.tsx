import * as React from "react";
import { ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceTag, SeverityBadge } from "./primitives";
import type { AuditCheckRowModel } from "../types/models";

const rowToneClasses = {
  issue: {
    critical: "border-rose-200 bg-rose-50/40 hover:bg-rose-50/60",
    warning: "border-amber-200 bg-amber-50/40 hover:bg-amber-50/60",
    info: "border-blue-200/50 bg-blue-50/30 hover:bg-blue-50/50",
  },
  passed: "border-emerald-500/10 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05]",
  notApplicable: "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70",
  systemError: "border-amber-200 bg-amber-50/30 hover:bg-amber-50/50",
};

const iconToneClasses = {
  critical: "text-rose-600",
  warning: "text-amber-600",
  info: "text-blue-600",
  success: "text-emerald-500",
  neutral: "text-slate-500",
  systemError: "text-amber-600",
};

const detailBorderClasses = {
  issue: "border-rose-100/80",
  passed: "border-emerald-100/80",
  notApplicable: "border-slate-100",
  systemError: "border-amber-100/80",
};

export function AuditCheckRow({ model }: { model: AuditCheckRowModel }) {
  const isIssue = model.kind === "issue";
  const isPassed = model.kind === "passed";
  const isNotApplicable = model.kind === "not_applicable";
  const isSystemError = model.kind === "system_error";
  const rowToneClass = isIssue
    ? rowToneClasses.issue[
        model.tone === "critical"
          ? "critical"
          : model.tone === "warning"
            ? "warning"
            : "info"
      ]
    : isPassed
      ? rowToneClasses.passed
      : isNotApplicable
        ? rowToneClasses.notApplicable
        : rowToneClasses.systemError;
  const iconToneClass = isIssue
    ? iconToneClasses[
        model.tone === "critical"
          ? "critical"
          : model.tone === "warning"
            ? "warning"
            : "info"
      ]
    : isPassed
      ? iconToneClasses.success
      : isNotApplicable
        ? iconToneClasses.neutral
        : iconToneClasses.systemError;

  const detailBorder = isIssue
    ? detailBorderClasses.issue
    : isPassed
      ? detailBorderClasses.passed
      : isNotApplicable
        ? detailBorderClasses.notApplicable
        : detailBorderClasses.systemError;

  const statusIcon = isPassed ? (
    <CheckCircle2 className="h-4 w-4" />
  ) : isNotApplicable ? (
    <Info className="h-4 w-4" />
  ) : isSystemError ? (
    <AlertTriangle className="h-4 w-4" />
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
                  : model.kind === "not_applicable"
                    ? "neutral"
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
          "border-t px-5 py-5 text-left text-sm",
          detailBorder,
          isIssue
            ? "text-slate-600"
            : isPassed
              ? "text-emerald-700"
              : isNotApplicable
                ? "text-slate-700"
                : "text-amber-800"
        )}
      >
        <div className="space-y-3">
          {model.messageSections.map((section) => (
            <div key={section.label}>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                {section.label}
              </span>
              <p className="mt-1 leading-relaxed">{section.body}</p>
            </div>
          ))}
          {model.selector ? (
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Page area
              </span>
              <p className="mt-1">
                <code className="break-all whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700">
                  {model.selector}
                </code>
              </p>
            </div>
          ) : null}
          {model.metric ? (
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Metric
              </span>
              <p className="mt-1 font-mono text-xs tabular-nums">{model.metric}</p>
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}
