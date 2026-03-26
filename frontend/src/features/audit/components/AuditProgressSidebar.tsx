import * as React from "react";
import {
  AlertCircle,
  BadgeCheck,
  LoaderCircle,
  Radar,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MetaLabel, SurfaceCard } from "./primitives";

type AuditProgressSidebarProps = {
  connectionLabel: string;
  hasAuditFailed: boolean;
  targetUrlLabel: string;
  gapsCount: number | string;
  signalsCount: number | string;
  progressValue: number;
  progressLabel: string;
  progressBarClassName: string;
  currentStepMessage: string;
  operationState: "failed" | "pending" | "ready" | "active";
};

export function AuditProgressSidebar({
  connectionLabel,
  hasAuditFailed,
  targetUrlLabel,
  gapsCount,
  signalsCount,
  progressValue,
  progressLabel,
  progressBarClassName,
  currentStepMessage,
  operationState,
}: AuditProgressSidebarProps) {
  return (
    <div className="h-fit space-y-6 lg:sticky lg:top-24">
      <SurfaceCard>
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
          Live Pulse
        </div>
        <div className="mt-8 space-y-6">
          <div>
            <MetaLabel>Connection</MetaLabel>
            <div
              className={cn(
                "mt-2 text-xl font-bold",
                hasAuditFailed ? "text-rose-600" : "text-slate-900"
              )}
            >
              {connectionLabel}
            </div>
          </div>

          <div>
            <MetaLabel>Targets</MetaLabel>
            <div className="mt-2 break-all text-sm font-medium text-slate-600">
              {targetUrlLabel}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">
                Gaps
              </div>
              <div className="text-3xl font-black text-rose-500">
                {operationState === "active" && gapsCount === 0 ? "—" : gapsCount}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                Signals
              </div>
              <div className="text-3xl font-black text-emerald-500">
                {operationState === "active" && signalsCount === 0 ? "—" : signalsCount}
              </div>
            </div>
          </div>

          <div>
            <MetaLabel className="mb-2">Visibility Mapping</MetaLabel>
            <Progress
              value={progressValue}
              className="h-2 bg-slate-100"
              indicatorClassName={cn("rounded-full", progressBarClassName)}
            />
            <div
              className={cn(
                "mt-2 text-[10px] font-black font-mono",
                hasAuditFailed ? "text-rose-600" : "text-slate-500"
              )}
            >
              {progressLabel}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Active Operation
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-bold",
                hasAuditFailed ? "text-rose-600" : "text-slate-900"
              )}
            >
              {operationState === "failed" ? (
                <>
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span className="truncate">{currentStepMessage}</span>
                </>
              ) : operationState === "pending" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  <span className="truncate">{currentStepMessage}</span>
                </>
              ) : operationState === "ready" ? (
                <>
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  <span className="truncate">{currentStepMessage}</span>
                </>
              ) : (
                <>
                  <Radar className="h-4 w-4 animate-pulse text-primary" />
                  <span className="truncate">{currentStepMessage}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
