import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusToneClasses = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  info: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/15 text-warning-foreground",
  critical: "border-destructive/20 bg-destructive/10 text-destructive",
  pending: "border-border bg-muted text-muted-foreground",
} as const;

export type StatusBadgeTone = keyof typeof statusToneClasses;

type StatusBadgeProps = {
  tone?: StatusBadgeTone;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function StatusBadge({
  tone = "neutral",
  pulse = false,
  className,
  children,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.16em] uppercase",
        statusToneClasses[tone],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          pulse && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
}
