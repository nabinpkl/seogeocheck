"use client";

import { AuditSectionView } from "./AuditSectionView";
import { useAuditSectionController } from "./useAuditSectionController";

export function AuditSection() {
  const viewProps = useAuditSectionController();

  return <AuditSectionView {...viewProps} />;
}
