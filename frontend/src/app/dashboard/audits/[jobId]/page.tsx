import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { AuditReportDetail } from "@/features/audit/components/AuditReportDetail";
import { getOwnedAuditReport } from "@/lib/backend-server";

type AuditDetailPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

function formatTimestamp(value?: string) {
  if (!value) {
    return "Unknown";
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

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { jobId } = await params;
  const report = await getOwnedAuditReport(jobId);

  if (!report || !Array.isArray(report.checks)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="ghost" className="h-9 rounded-full px-3 text-sm font-semibold text-slate-600">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Back to dashboard
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Audit Report
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {report.targetUrl}
              </h1>
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="size-4" />
                Generated {formatTimestamp(report.generatedAt)}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="h-11 rounded-full px-5 text-sm font-semibold">
            <a href={report.targetUrl} target="_blank" rel="noreferrer">
              Visit audited site
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>

        <AuditReportDetail report={report} />
      </PageShell>
    </div>
  );
}
