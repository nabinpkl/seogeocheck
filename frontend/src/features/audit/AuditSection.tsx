"use client";

import { AuditSectionView } from "./components/AuditSectionView";
import { useAuditSectionController } from "./hooks/useAuditSectionController";
import type { AuthUser } from "@/features/auth/lib/server-auth";

export function AuditSection({
  variant = "hero",
  viewer = null,
  projectSlug = null,
}: {
  variant?: "hero" | "dashboard";
  viewer?: AuthUser | null;
  projectSlug?: string | null;
}) {
  const viewProps = useAuditSectionController({ viewer, projectSlug });

  return <AuditSectionView {...viewProps} variant={variant} />;
}
