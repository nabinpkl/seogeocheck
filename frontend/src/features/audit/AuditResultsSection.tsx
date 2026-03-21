"use client";

import * as React from "react";
import { AuditCategoryScoreGrid } from "./AuditCategoryScoreGrid";
import { AuditChecksSection } from "./AuditChecksSection";
import { AuditResultActions } from "./AuditResultActions";
import { AuditScoreHero } from "./AuditScoreHero";
import type { AuditResultsSectionProps } from "./AuditSection.types";

export function AuditResultsSection({
  reportScore,
  issueCount,
  passedCheckCount,
  categoryScores,
  topIssueRow,
  issueRows,
  passedRows,
  onScrollToIssues,
  onScrollToPassed,
  onReAudit,
  onReset,
}: AuditResultsSectionProps) {
  return (
    <>
      <AuditScoreHero
        reportScore={reportScore}
        issueCount={issueCount}
        passedCheckCount={passedCheckCount}
        onScrollToIssues={onScrollToIssues}
        onScrollToPassed={onScrollToPassed}
      />

      <AuditCategoryScoreGrid categories={categoryScores} />

      <section id="requires-attention">
        <AuditChecksSection
          id="requires-attention-panel"
          title="Requires Your Attention"
          countLabel={`${issueCount} Issues Detected`}
          heroRow={topIssueRow}
          rows={issueRows}
          emptyMessage="No urgent issues were flagged in this audit. Your site cleared every tracked check in this slice."
          emptyTone="success"
        />
      </section>

      <section id="passed-checks">
        <AuditChecksSection
          id="passed-checks-panel"
          title="Passed Checks"
          countLabel={`${passedCheckCount} Validated`}
          rows={passedRows}
          emptyMessage="We did not capture any confirmed passed checks for this run."
        />
      </section>

      <AuditResultActions onReAudit={onReAudit} onReset={onReset} />
    </>
  );
}
