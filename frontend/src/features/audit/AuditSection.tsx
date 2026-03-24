"use client";

import { AuditSectionView } from "./components/AuditSectionView";
import { useAuditSectionController } from "./hooks/useAuditSectionController";

export function AuditSection() {
  const viewProps = useAuditSectionController();

  return <AuditSectionView {...viewProps} />;
}
