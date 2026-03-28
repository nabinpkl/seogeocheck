"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowRight, Clock3, FileSearch, Globe, Search, ShieldCheck } from "lucide-react";
import { AuditSection } from "@/features/audit/AuditSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardAuditSummary } from "../types/audits";

type ProjectDashboardProps = {
  audits: DashboardAuditSummary[];
};

function statusTone(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "VERIFIED":
      return "Ready";
    case "FAILED":
      return "Failed";
    case "STREAMING":
      return "Running";
    case "COMPLETE":
      return "Finalizing";
    case "QUEUED":
      return "Queued";
    default:
      return status;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "In progress";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProjectDashboard({ audits }: ProjectDashboardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredAudits = React.useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return audits;
    }

    return audits.filter((audit) =>
      audit.targetUrl.toLowerCase().includes(term) ||
      audit.jobId.toLowerCase().includes(term)
    );
  }, [audits, searchQuery]);

  const readyCount = audits.filter((audit) => audit.status === "VERIFIED").length;
  const activeCount = audits.filter(
    (audit) => audit.status === "QUEUED" || audit.status === "STREAMING" || audit.status === "COMPLETE"
  ).length;
  const averageScore =
    audits.filter((audit) => typeof audit.score === "number").reduce((sum, audit) => sum + (audit.score ?? 0), 0) /
      Math.max(audits.filter((audit) => typeof audit.score === "number").length, 1);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Owned Audits
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{audits.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FileSearch className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Ready Reports
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{readyCount}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Fleet Snapshot
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {Number.isFinite(averageScore) ? Math.round(averageScore) : 0}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">{activeCount} active now</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div id="audit-section">
        <AuditSection variant="dashboard" isAuthenticated />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Audit History
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Claimed reports attached to this account
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search URLs or job IDs"
              className="h-11 rounded-full border-slate-200 bg-white pl-10"
            />
          </div>
        </div>

        {filteredAudits.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-white/90">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
                <Globe className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-900">
                  {audits.length === 0 ? "No claimed audits yet" : "No audits match this search"}
                </CardTitle>
                <p className="max-w-lg text-sm leading-6 text-slate-600">
                  {audits.length === 0
                    ? "Start a fresh audit above or claim one from the anonymous homepage flow to build your account history."
                    : "Try another URL, hostname, or job ID."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredAudits.map((audit) => (
              <Link
                key={audit.jobId}
                href={`/dashboard/audits/${audit.jobId}`}
                className="group"
              >
                <Card className="border-white/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("border font-semibold", statusTone(audit.status))}>
                          {formatStatus(audit.status)}
                        </Badge>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {audit.jobId}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-slate-950">
                          {audit.targetUrl}
                        </h3>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <Clock3 className="size-4" />
                          Updated {formatTimestamp(audit.completedAt ?? audit.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                      <div className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Score
                        </p>
                        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                          {typeof audit.score === "number" ? audit.score : "—"}
                        </p>
                      </div>
                      <Button variant="ghost" className="rounded-full px-4 text-sm font-semibold text-primary">
                        Open report
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
