"use client";

import { AuditSectionView } from "./components/AuditSectionView";
import { useAuditSectionController } from "./hooks/useAuditSectionController";

export function AuditSection({
  variant = "hero",
  isAuthenticated = false,
}: {
  variant?: "hero" | "dashboard";
  isAuthenticated?: boolean;
}) {
  const viewProps = useAuditSectionController({ isAuthenticated });

  return <AuditSectionView {...viewProps} variant={variant} />;
}
