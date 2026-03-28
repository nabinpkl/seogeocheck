"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuditInputPanel } from "./AuditInputPanel";
import { AuditLiveStreamPanel } from "./AuditLiveStreamPanel";
import { AuditProgressSidebar } from "./AuditProgressSidebar";
import { AuditResultActions } from "./AuditResultActions";
import { AuditStatusHeader } from "./AuditStatusHeader";
import { AuditResultsSection } from "./AuditResultsSection";
import type { AuditSectionViewProps } from "../types/section";

export function AuditSectionView({
  inputRef,
  resultPanelRef,
  visibility,
  inputPanel,
  statusHeader,
  liveStream,
  progressSidebar,
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
            <div
              className={`grid gap-6 ${
                visibility.showProgressSidebar
                  ? "lg:grid-cols-[1fr_380px]"
                  : "grid-cols-1"
              }`}
            >
              <div className="flex flex-col gap-6">
                <AuditStatusHeader
                  model={statusHeader.model}
                  actions={
                    statusHeader.showCompactActions ? (
                      <AuditResultActions
                        compact
                        onReAudit={actions.onReAudit}
                        onReset={actions.onReset}
                      />
                    ) : null
                  }
                />

                {visibility.showLiveStream ? (
                  <AuditLiveStreamPanel rows={liveStream.rows} />
                ) : null}

                {results ? <AuditResultsSection {...results} /> : null}
              </div>

              {visibility.showProgressSidebar ? (
                <AuditProgressSidebar
                  connectionLabel={progressSidebar.connectionLabel}
                  hasAuditFailed={progressSidebar.hasAuditFailed}
                  targetUrlLabel={progressSidebar.targetUrlLabel}
                  gapsCount={progressSidebar.gapsCount}
                  signalsCount={progressSidebar.signalsCount}
                  progressValue={progressSidebar.progressValue}
                  progressLabel={progressSidebar.progressLabel}
                  progressBarClassName={progressSidebar.progressBarClassName}
                  currentStepMessage={progressSidebar.currentStepMessage}
                  operationState={progressSidebar.operationState}
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
