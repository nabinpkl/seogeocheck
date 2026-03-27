import * as React from "react";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Left Sidebar Layout */}
      <DashboardSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 relative min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
