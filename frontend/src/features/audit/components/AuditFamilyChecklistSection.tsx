import * as React from "react";
import type { AuditFamilyChecklistGroupModel } from "../types/models";
import { AuditCheckRow } from "./AuditCheckRow";
import { EmptyPanelState, MetaLabel, SectionEyebrow, SurfaceCard } from "./primitives";

type AuditFamilyChecklistSectionProps = {
  groups: AuditFamilyChecklistGroupModel[];
};

export function AuditFamilyChecklistSection({
  groups,
}: AuditFamilyChecklistSectionProps) {
  return (
    <section id="family-checklists" className="scroll-mt-24 space-y-4">
      <div className="px-2 py-8">
        <div className="mb-4 flex items-center gap-4">
          <SectionEyebrow className="text-white/50 tracking-[0.5em]">Detailed Analysis</SectionEyebrow>
          <div className="h-px flex-1 bg-slate-500/60" />
        </div>
      </div>

      {groups.length === 0 ? (
        <SurfaceCard>
          <EmptyPanelState icon={null}>
            No checklist groups were generated for this run.
          </EmptyPanelState>
        </SurfaceCard>
      ) : (
        groups.map((group) => (
          <SurfaceCard key={group.id} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h4 className="text-lg font-black tracking-tight text-slate-900">{group.title}</h4>
              <MetaLabel>
                {group.issueCount > 0 ? (
                  <>
                    {group.issueCount} {group.issueCount === 1 ? "Issue" : "Issues"}
                    {group.passedCount > 0 ? ` · ${group.passedCount} Passed` : ""}
                    {group.notApplicableCount > 0 ? ` · ${group.notApplicableCount} N/A` : ""}
                    {group.systemErrorCount > 0
                      ? ` · ${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : group.passedCount > 0 ? (
                  <>
                    {`${group.passedCount} Passed`}
                    {group.notApplicableCount > 0 ? ` · ${group.notApplicableCount} N/A` : ""}
                    {group.systemErrorCount > 0
                      ? ` · ${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : group.notApplicableCount > 0 || group.systemErrorCount > 0 ? (
                  <>
                    {group.notApplicableCount > 0 ? `${group.notApplicableCount} N/A` : ""}
                    {group.notApplicableCount > 0 && group.systemErrorCount > 0 ? " · " : ""}
                    {group.systemErrorCount > 0
                      ? `${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : (
                  "No checks"
                )}
              </MetaLabel>
            </div>
            <div className="space-y-2.5">
              {group.rows.map((row) => (
                <AuditCheckRow key={row.id} model={row} />
              ))}
            </div>
          </SurfaceCard>
        ))
      )}
    </section>
  );
}
