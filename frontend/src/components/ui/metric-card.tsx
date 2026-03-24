import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge, type StatusBadgeTone } from "./status-badge";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  tone?: StatusBadgeTone;
  icon?: React.ReactNode;
  className?: string;
};

export function MetricCard({
  label,
  value,
  helper,
  delta,
  deltaDirection = "flat",
  tone = "neutral",
  icon,
  className,
}: MetricCardProps) {
  const DeltaIcon =
    deltaDirection === "flat"
      ? null
      : deltaDirection === "down"
        ? TrendingDown
        : TrendingUp;
  const deltaLabel =
    deltaDirection === "down"
      ? "down"
      : deltaDirection === "up"
        ? "up"
        : "steady";

  return (
    <Card className={cn("border border-border/80 shadow-sm", className)}>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription className="text-[11px] font-black tracking-[0.18em] uppercase">
              {label}
            </CardDescription>
            <CardTitle className="text-3xl font-black tracking-tight text-foreground">
              {value}
            </CardTitle>
          </div>
          {icon ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        {helper ? (
          <p className="max-w-[20rem] text-sm leading-relaxed text-muted-foreground">
            {helper}
          </p>
        ) : (
          <span />
        )}
        {delta ? (
          <StatusBadge tone={tone} className="shrink-0">
            {DeltaIcon ? <DeltaIcon className="size-3" aria-hidden="true" /> : null}
            {delta} {deltaLabel}
          </StatusBadge>
        ) : null}
      </CardContent>
    </Card>
  );
}
