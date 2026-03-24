"use client";

import * as React from "react";
import { AuditCategoryScoreGrid } from "./AuditCategoryScoreGrid";
import { AuditChecksSection } from "./AuditChecksSection";
import { AuditFamilyChecklistSection } from "./AuditFamilyChecklistSection";
import { AuditResultActions } from "./AuditResultActions";
import { AuditScoreHero } from "./AuditScoreHero";
import type { AuditResultsSectionProps } from "../types/section";

export function AuditResultsSection({
  reportScore,
  issueCount,
  passedCheckCount,
  notApplicableCount,
  systemErrorCount,
  categoryScores,
  topRecommendationHeroRow,
  topRecommendationRows,
  familyGroups,
  onScrollToIssues,
  onScrollToFamilies,
  onReAudit,
  onReset,
}: AuditResultsSectionProps) {
  return (
    <>
      <AuditScoreHero
        reportScore={reportScore}
        issueCount={issueCount}
        passedCheckCount={passedCheckCount}
        notApplicableCount={notApplicableCount}
        systemErrorCount={systemErrorCount}
        onScrollToIssues={onScrollToIssues}
        onScrollToFamilies={onScrollToFamilies}
      />

      <AuditCategoryScoreGrid categories={categoryScores} />

      <section id="requires-attention">
        <AuditChecksSection
          id="requires-attention-panel"
          title="Flagged Issues"
          countLabel={`${topRecommendationRows.length + (topRecommendationHeroRow ? 1 : 0)} flagged`}
          heroRow={topRecommendationHeroRow}
          rows={topRecommendationRows}
          emptyMessage="No issues flagged — every check passed this run."
          emptyTone="success"
        />
      </section>

      <AuditFamilyChecklistSection groups={familyGroups} />

      <AuditResultActions onReAudit={onReAudit} onReset={onReset} />
    </>
  );
}
