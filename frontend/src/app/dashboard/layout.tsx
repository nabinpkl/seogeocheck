import * as React from "react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { SIGN_IN_PATH } from "@/lib/routes";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    redirect(`${SIGN_IN_PATH}?next=/dashboard`);
  }

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Left Sidebar Layout */}
      <DashboardSidebar user={viewer} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 relative min-w-0">
        <DashboardHeader user={viewer} />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
