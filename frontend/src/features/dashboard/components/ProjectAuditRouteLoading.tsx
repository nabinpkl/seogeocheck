"use client";

import { useShallow } from "zustand/react/shallow";
import { PageShell } from "@/components/ui/page-shell";
import { AuditExperiencePanel } from "@/features/audit/components/AuditExperiencePanel";
import { useAuditExperience } from "@/features/audit/hooks/useAuditExperience";
import { useAuditStore } from "@/store/use-audit-store";

export function ProjectAuditRouteLoading() {
  const { jobId, targetUrl, reportUrl, streamUrl, status, connectionStatus, events, error } =
    useAuditStore(
      useShallow((state) => ({
        jobId: state.jobId,
        targetUrl: state.targetUrl,
        reportUrl: state.reportUrl,
        streamUrl: state.streamUrl,
        status: state.status,
        connectionStatus: state.connectionStatus,
        events: state.events,
        error: state.error,
      }))
    );
  const { connectToStream, markVerified } = useAuditStore(
    useShallow((state) => ({
      connectToStream: state.connectToStream,
      markVerified: state.markVerified,
    }))
  );

  const experience = useAuditExperience({
    reportQueryKeyId: jobId,
    status,
    isPending: status === "IDLE",
    displayTargetUrl: targetUrl || null,
    placeholderUrl: targetUrl || "Preparing your audit",
    reportUrl,
    streamUrl,
    connectionStatus,
    events,
    liveError: error,
    isLiveSession: Boolean(jobId),
    onConnectToStream: connectToStream,
    onMarkVerified: markVerified,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <AuditExperiencePanel
          headerModel={experience.headerModel}
          showLivePanels={experience.showLivePanels}
          liveProgress={experience.liveProgress}
          liveStreamRows={experience.liveStreamRows}
          reportContent={null}
          emptyContent={null}
        />
      </PageShell>
    </div>
  );
}
