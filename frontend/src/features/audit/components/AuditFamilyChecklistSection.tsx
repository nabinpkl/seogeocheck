import * as React from "react";
import type { AuditFamilyChecklistGroupModel } from "../types/models";
import { AuditCheckRow } from "./AuditCheckRow";
import { EmptyPanelState, MetaLabel, SurfaceCard } from "./primitives";

type AuditFamilyChecklistSectionProps = {
  groups: AuditFamilyChecklistGroupModel[];
};

export function AuditFamilyChecklistSection({
  groups,
}: AuditFamilyChecklistSectionProps) {
  return (
    <section id="family-checklists" className="scroll-mt-24 space-y-4">
      <SurfaceCard className="space-y-2 py-6">
        <div className="flex flex-col px-2 text-left">
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            SEO Signals Checklist
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Organized performance and issue insights by SEO category.
          </p>
        </div>
      </SurfaceCard>

      {groups.length === 0 ? (
        <SurfaceCard>
          <EmptyPanelState icon={null}>
            No checklist groups were generated for this run.
          </EmptyPanelState>
        </SurfaceCard>
      ) : (
        groups.map((group) => (
          <SurfaceCard key={group.id} className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-2 px-2">
              <h4 className="text-xl font-black tracking-tight text-slate-900">{group.title}</h4>
              <MetaLabel>
                {group.issueCount > 0 ? (
                  <>
                    {group.issueCount} {group.issueCount === 1 ? "Issue" : "Issues"}
                    {group.passedCount > 0 ? ` • ${group.passedCount} Passed` : ""}
                    {group.notApplicableCount > 0 ? ` • ${group.notApplicableCount} Not Applicable` : ""}
                    {group.systemErrorCount > 0
                      ? ` • ${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : group.passedCount > 0 ? (
                  <>
                    {`${group.passedCount} Passed`}
                    {group.notApplicableCount > 0 ? ` • ${group.notApplicableCount} N/A` : ""}
                    {group.systemErrorCount > 0
                      ? ` • ${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : group.notApplicableCount > 0 || group.systemErrorCount > 0 ? (
                  <>
                    {group.notApplicableCount > 0 ? `${group.notApplicableCount} N/A` : ""}
                    {group.notApplicableCount > 0 && group.systemErrorCount > 0 ? " • " : ""}
                    {group.systemErrorCount > 0
                      ? `${group.systemErrorCount} Couldn't verify`
                      : ""}
                  </>
                ) : (
                  "No checks"
                )}
              </MetaLabel>
            </div>
            <div className="space-y-3">
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
