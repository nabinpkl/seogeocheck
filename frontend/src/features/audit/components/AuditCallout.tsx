import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-card",
  info: "border-primary/20 bg-primary/5",
  success: "border-success/20 bg-success/5",
  warning: "border-warning/20 bg-warning/10",
  critical: "border-destructive/20 bg-destructive/5",
  pending: "border-border bg-muted/40",
};

type AuditCalloutProps = {
  title: string;
  description: string;
  tone?: StatusBadgeTone;
  statusLabel?: string;
  meta?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
};

export function AuditCallout({
  title,
  description,
  tone = "info",
  statusLabel,
  meta,
  ctaLabel,
  ctaHref,
  className,
}: AuditCalloutProps) {
  return (
    <Card className={cn("border shadow-sm", toneClasses[tone], className)}>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {statusLabel ? <StatusBadge tone={tone}>{statusLabel}</StatusBadge> : null}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {ctaLabel && ctaHref ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      {meta ? (
        <CardContent>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {meta}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
