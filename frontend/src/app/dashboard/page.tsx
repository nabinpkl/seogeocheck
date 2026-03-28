import * as React from "react";
import { PageShell } from "@/components/ui/page-shell";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { ProjectDashboard } from "@/features/dashboard/components/ProjectDashboard";

export default async function DashboardPage() {
  const viewer = await getCurrentUser();

  return (
    <div className="min-h-screen pb-24 bg-slate-50/50">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="mb-10">
          <p className="text-slate-500 font-medium max-w-2xl text-lg">
            Manage your site projects, track visibility health across your portfolio, and perform audits.
          </p>
        </div>

        <ProjectDashboard />
      </PageShell>
    </div>
  );
}
