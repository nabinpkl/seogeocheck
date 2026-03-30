"use client";

import * as React from "react";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import { SidebarContent } from "./SidebarContent";

type DashboardSidebarProps = {
  user: AuthUser;
};

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border/50 h-screen fixed left-0 top-0 overflow-hidden">
      <SidebarContent user={user} />
    </aside>
  );
}

