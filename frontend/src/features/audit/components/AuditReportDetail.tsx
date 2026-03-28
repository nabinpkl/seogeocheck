"use client";

import * as React from "react";
import { AuditCategoryScoreGrid } from "./AuditCategoryScoreGrid";
import { AuditChecksSection } from "./AuditChecksSection";
import { AuditFamilyChecklistSection } from "./AuditFamilyChecklistSection";
import { AuditScoreHero } from "./AuditScoreHero";
import {
  buildAuditCheckRowModel,
  buildCategoryScoreModels,
  buildFamilyChecklistGroups,
  isIssueCheck,
  isNotApplicableCheck,
  isPassedCheck,
  isSystemErrorCheck,
} from "../lib/view-models";
import type { AuditReport } from "@/types/audit";

type AuditReportDetailProps = {
  report: AuditReport;
};

export function AuditReportDetail({ report }: AuditReportDetailProps) {
  const reportChecks = Array.isArray(report.checks) ? report.checks : [];
  const reportFindings = reportChecks.filter((check) => isIssueCheck(check.status));
  const reportPassedChecks = reportChecks.filter((check) => isPassedCheck(check.status));
  const reportNotApplicableChecks = reportChecks.filter((check) =>
    isNotApplicableCheck(check.status)
  );
  const reportSystemErrorChecks = reportChecks.filter((check) =>
    isSystemErrorCheck(check.status)
  );
  const reportScore =
    typeof report.summary?.score === "number" ? report.summary.score : 0;
  const reportScoreConfidence =
    typeof report.scoring?.overall?.confidence === "number"
      ? report.scoring.overall.confidence
      : null;
  const issueCount =
    typeof report.summary?.issueCount === "number"
      ? report.summary.issueCount
      : reportFindings.length;
  const passedCheckCount =
    typeof report.summary?.passedCheckCount === "number"
      ? report.summary.passedCheckCount
      : reportPassedChecks.length;
  const notApplicableCount =
    typeof report.summary?.notApplicableCount === "number"
      ? report.summary.notApplicableCount
      : reportNotApplicableChecks.length;
  const systemErrorCount =
    typeof report.summary?.systemErrorCount === "number"
      ? report.summary.systemErrorCount
      : reportSystemErrorChecks.length;
  const categoryScores = buildCategoryScoreModels(report);
  const topRecommendationRows = reportChecks
    .filter((check) => isIssueCheck(check.status))
    .map((check, index) =>
      buildAuditCheckRowModel(
        {
          ...check,
          id: check.id ?? `${check.selector ?? "issue"}-${index}`,
        },
        "issue"
      )
    );
  const [topRecommendationHeroRow, ...topRecommendationRowsRest] =
    topRecommendationRows;
  const familyGroups = buildFamilyChecklistGroups(reportChecks);

  return (
    <div className="space-y-6">
      <AuditScoreHero
        reportScore={reportScore}
        scoreConfidence={reportScoreConfidence}
        issueCount={issueCount}
        passedCheckCount={passedCheckCount}
        notApplicableCount={notApplicableCount}
        systemErrorCount={systemErrorCount}
        onScrollToIssues={() =>
          document.getElementById("requires-attention")?.scrollIntoView({
            behavior: "smooth",
          })
        }
        onScrollToFamilies={() =>
          document.getElementById("family-checklists")?.scrollIntoView({
            behavior: "smooth",
          })
        }
      />

      <AuditCategoryScoreGrid categories={categoryScores} />

      <section id="requires-attention">
        <AuditChecksSection
          id="requires-attention-panel"
          title="Flagged Issues"
          countLabel={`${topRecommendationRowsRest.length + (topRecommendationHeroRow ? 1 : 0)} flagged`}
          heroRow={topRecommendationHeroRow ? { ...topRecommendationHeroRow, isHero: true } : null}
          rows={topRecommendationRowsRest}
          emptyMessage="No issues flagged — every check passed this run."
          emptyTone="success"
        />
      </section>

      <AuditFamilyChecklistSection groups={familyGroups} />
    </div>
  );
}
