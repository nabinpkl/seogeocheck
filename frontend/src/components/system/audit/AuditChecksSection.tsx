import * as React from "react";
import { AuditCheckRow } from "@/components/system/audit/AuditCheckRow";
import {
  EmptyPanelState,
  MetaLabel,
  SurfaceCard,
} from "@/components/system/audit/primitives";
import type { AuditCheckRowModel } from "@/components/system/audit/models";

type AuditChecksSectionProps = {
  id: string;
  title: string;
  countLabel: string;
  heroRow?: AuditCheckRowModel | null;
  rows: AuditCheckRowModel[];
  emptyMessage: string;
  emptyTone?: "neutral" | "success";
};

export function AuditChecksSection({
  id,
  title,
  countLabel,
  heroRow,
  rows,
  emptyMessage,
  emptyTone = "neutral",
}: AuditChecksSectionProps) {
  const isEmpty = !heroRow && rows.length === 0;

  return (
    <section id={id} className="scroll-mt-24">
      <SurfaceCard className="space-y-6">
        <div className="flex items-end justify-between px-2">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">{title}</h3>
          </div>
          <MetaLabel>{countLabel}</MetaLabel>
        </div>

        {heroRow ? <AuditCheckRow model={heroRow} /> : null}

        {isEmpty ? (
          <EmptyPanelState
            className={
              emptyTone === "success"
                ? "border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-800"
                : undefined
            }
            icon={null}
          >
            {emptyMessage}
          </EmptyPanelState>
        ) : rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <AuditCheckRow key={row.id} model={row} />
            ))}
          </div>
        ) : null}
      </SurfaceCard>
    </section>
  );
}
