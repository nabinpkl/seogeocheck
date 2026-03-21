import * as React from "react";
import {
  StatusPill,
  SurfaceCard,
} from "@/components/system/audit/primitives";
import type { AuditHeaderModel } from "@/components/system/audit/models";

type AuditStatusHeaderProps = {
  model: AuditHeaderModel;
  actions?: React.ReactNode;
};

export function AuditStatusHeader({
  model,
  actions,
}: AuditStatusHeaderProps) {
  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          tone={model.statusTone}
          pulse={model.statusTone === "info" || model.statusTone === "pending"}
        >
          {model.statusLabel}
        </StatusPill>

        {model.targetUrlHref ? (
          <a
            href={model.targetUrlHref}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[240px] truncate text-sm text-slate-400 underline decoration-slate-200 underline-offset-4 transition-all hover:text-primary hover:decoration-primary/50 sm:max-w-md lg:max-w-xl"
          >
            {model.targetUrlLabel}
          </a>
        ) : (
          <span className="text-sm text-slate-400">{model.targetUrlLabel}</span>
        )}

        {actions}
      </div>

      <div className="mt-6 flex items-center gap-3 text-slate-900">
        {model.titleIcon}
        <p
          className={
            model.titleTone === "critical"
              ? "text-xl font-bold tracking-tight text-rose-800"
              : "text-xl font-bold tracking-tight"
          }
        >
          {model.title}
        </p>
      </div>

      {model.errorMessage ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {model.errorMessage}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
