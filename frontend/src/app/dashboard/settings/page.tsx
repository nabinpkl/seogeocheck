import * as React from "react";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { AccountSettingsPanel } from "@/features/dashboard/components/AccountSettingsPanel";
import { getCurrentUser } from "@/features/auth/lib/server-auth";

export default async function DashboardSettingsPage() {
  const viewer = await getCurrentUser();

  if (!viewer || viewer.isAnonymous) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="mb-10 max-w-3xl space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
            Account settings
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Manage your account.
          </h1>
          <p className="text-lg font-medium text-slate-500">
            Change your password or delete your account.
          </p>
        </div>

        <AccountSettingsPanel
          user={{
            email: viewer.email ?? "",
            emailVerified: viewer.emailVerified,
            createdAt: viewer.createdAt,
          }}
        />
      </PageShell>
    </div>
  );
}
