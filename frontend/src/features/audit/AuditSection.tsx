"use client";

import { AuditSectionView } from "./components/AuditSectionView";
import { useAuditSectionController } from "./hooks/useAuditSectionController";

export function AuditSection({
  variant = "hero",
  isAuthenticated = false,
  projectSlug = null,
}: {
  variant?: "hero" | "dashboard";
  isAuthenticated?: boolean;
  projectSlug?: string | null;
}) {
  const viewProps = useAuditSectionController({ isAuthenticated, projectSlug });

  return <AuditSectionView {...viewProps} variant={variant} />;
}
