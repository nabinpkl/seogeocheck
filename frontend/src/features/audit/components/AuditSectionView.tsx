"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuditInputPanel } from "./AuditInputPanel";
import { AuditExperiencePanel } from "./AuditExperiencePanel";
import { AuditResultActions } from "./AuditResultActions";
import { AuditResultsSection } from "./AuditResultsSection";
import type { AuditSectionViewProps } from "../types/section";

export function AuditSectionView({
  inputRef,
  resultPanelRef,
  liveProgressRef,
  visibility,
  inputPanel,
  statusHeader,
  liveStream,
  liveProgress,
  results,
  actions,
  variant = "hero",
}: AuditSectionViewProps & { variant?: "hero" | "dashboard" }) {
  return (
    <div className="w-full self-stretch">
      <AuditInputPanel
        action={inputPanel.action}
        onSubmit={inputPanel.onSubmit}
        inputRef={inputRef}
        url={inputPanel.url}
        clientError={inputPanel.clientError}
        notice={inputPanel.notice}
        projectSlug={inputPanel.projectSlug}
        isPending={inputPanel.isPending}
        isAuditActive={inputPanel.isAuditActive}
        isTyping={inputPanel.isTyping}
        onUrlChange={inputPanel.onUrlChange}
        onExampleAudit={inputPanel.onExampleAudit}
        variant={variant}
      />

      <AnimatePresence initial={false}>
        {visibility.showResultPanel ? (
          <motion.div
            ref={resultPanelRef}
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="mx-auto mt-16 min-h-[400px] w-full max-w-6xl"
          >
            <AuditExperiencePanel
              headerModel={statusHeader.model}
              claimPanel={results?.claimPanel}
              headerActions={
                statusHeader.showCompactActions ? (
                  <AuditResultActions
                    compact
                    onReAudit={actions.onReAudit}
                    onReset={actions.onReset}
                  />
                ) : null
              }
              showLivePanels={visibility.showLiveProgress || visibility.showLiveStream}
              liveProgress={liveProgress}
              liveStreamRows={liveStream.rows}
              reportContent={results ? <AuditResultsSection {...results} /> : null}
              liveProgressRef={liveProgressRef}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
