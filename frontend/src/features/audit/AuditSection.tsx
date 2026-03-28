"use client";

import { AuditSectionView } from "./components/AuditSectionView";
import { useAuditSectionController } from "./hooks/useAuditSectionController";

export function AuditSection({ variant = "hero" }: { variant?: "hero" | "dashboard" }) {
  const viewProps = useAuditSectionController();

  return <AuditSectionView {...viewProps} variant={variant} />;
}
