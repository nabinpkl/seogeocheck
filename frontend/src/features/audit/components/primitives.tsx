import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditTone } from "../types/models";

const toneClasses: Record<AuditTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
};

export function SurfaceCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-3xl border border-slate-200 bg-white p-8 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetaLabel({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionEyebrow({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-[11px] font-black uppercase tracking-[0.3em] text-slate-500",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatusPill({
  tone = "neutral",
  pulse = false,
  className,
  children,
}: {
  tone?: AuditTone;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const dotColor =
    tone === "critical"
      ? "bg-rose-500"
      : tone === "success"
        ? "bg-emerald-500"
        : "bg-primary";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]",
        toneClasses[tone],
        className
      )}
    >
      <span
        className={cn("h-2.5 w-2.5 rounded-full", dotColor, pulse && "animate-pulse")}
      />
      {children}
    </span>
  );
}

export function EvidenceTag({
  className,
  children,
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "mt-1 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({
  tone,
  className,
  children,
}: {
  tone: AuditTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyPanelState({
  className,
  icon,
  children,
}: {
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400",
        className
      )}
    >
      {icon ?? <LoaderCircle className="mx-auto mb-4 h-6 w-6 animate-spin text-primary/40" />}
      {children}
    </div>
  );
}
