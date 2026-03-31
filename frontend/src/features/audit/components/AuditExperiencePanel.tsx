"use client";

import * as React from "react";
import { AuditLiveProgressPanel } from "./AuditLiveProgressPanel";
import { AuditLiveStreamPanel } from "./AuditLiveStreamPanel";
import { AuditStatusHeader } from "./AuditStatusHeader";
import type { AuditHeaderModel, AuditStreamRowModel } from "../types/models";

type AuditExperiencePanelProps = {
  headerModel: AuditHeaderModel;
  claimPanel?: {
    message: string;
    signUpHref: string | null;
    signInHref: string | null;
  } | null;
  headerActions?: React.ReactNode;
  showLivePanels: boolean;
  liveProgress: {
    phaseLabel: string;
    phaseDetail: string;
    gapsCount: number;
    signalsCount: number;
    progressValue: number;
    progressLabel: string;
    progressBarClassName: string;
    liveScoreState: "waiting" | "provisional" | "final";
    liveScoreValue: number | null;
    evaluatedChecksCount: number;
    showLiveMetrics: boolean;
    operationState: "failed" | "pending" | "ready" | "active";
  };
  liveStreamRows: AuditStreamRowModel[];
  reportContent: React.ReactNode | null;
  emptyContent?: React.ReactNode | null;
  liveProgressRef?: React.RefObject<HTMLDivElement | null>;
};

export function AuditExperiencePanel({
  headerModel,
  claimPanel = null,
  headerActions = null,
  showLivePanels,
  liveProgress,
  liveStreamRows,
  reportContent,
  emptyContent = null,
  liveProgressRef,
}: AuditExperiencePanelProps) {
  return (
    <div className="space-y-6">
      <AuditStatusHeader
        model={headerModel}
        claimPanel={claimPanel}
        actions={headerActions}
      />

      {showLivePanels ? (
        <>
          <div ref={liveProgressRef}>
            <AuditLiveProgressPanel
              phaseLabel={liveProgress.phaseLabel}
              phaseDetail={liveProgress.phaseDetail}
              gapsCount={liveProgress.gapsCount}
              signalsCount={liveProgress.signalsCount}
              progressValue={liveProgress.progressValue}
              progressLabel={liveProgress.progressLabel}
              progressBarClassName={liveProgress.progressBarClassName}
              liveScoreState={liveProgress.liveScoreState}
              liveScoreValue={liveProgress.liveScoreValue}
              evaluatedChecksCount={liveProgress.evaluatedChecksCount}
              showLiveMetrics={liveProgress.showLiveMetrics}
              operationState={liveProgress.operationState}
            />
          </div>
          <AuditLiveStreamPanel rows={liveStreamRows} />
        </>
      ) : null}

      {reportContent ?? emptyContent}
    </div>
  );
}
