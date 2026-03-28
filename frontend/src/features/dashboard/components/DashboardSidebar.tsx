import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Search,
  Settings,
  CreditCard,
  LogOut,
  Globe,
  Code2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { AuthUser } from "@/features/auth/lib/server-auth";

const NAV_ITEMS = [
  { name: "Projects Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Global Roster", href: "/dashboard/urls", icon: Globe },
  { name: "Competitors", href: "/dashboard/competitors", icon: Search },
];

const SETTINGS_ITEMS = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

type DashboardSidebarProps = {
  user: AuthUser;
};

function getInitials(email: string) {
  const localPart = email.split("@")[0] ?? "SG";
  const parts = localPart
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "SG";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border/50 min-h-screen fixed left-0 top-0">

      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border/40 pt-1">
        <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Image 
            src="/logo.png" 
            alt="SEOGEO Logo" 
            width={32} 
            height={32} 
            priority
            className="object-contain" 
          />
          <span className="font-display text-[22px] font-black tracking-tight uppercase text-slate-900 mt-0.5">
            SEOGEO
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div className="space-y-1">
          <p className="px-3 text-xs font-black tracking-[0.15em] text-muted-foreground uppercase mb-2">Analyze</p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                item.name === "Projects Overview"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.name}
            </Link>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-xs font-black tracking-[0.15em] text-muted-foreground uppercase mb-2">Account</p>
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[13px] text-primary">
              {getInitials(user.email)}
            </div>
            <div className="min-w-0 flex-1 mt-0.5">
              <span className="block truncate text-[15px] font-bold text-slate-900">{user.email}</span>
            </div>
          </div>
          
          <form action={logoutAction} className="mt-5">
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-xl text-[15px] font-medium text-slate-600 transition hover:text-slate-900"
            >
              <span>Sign Out</span>
              <LogOut className="size-4 text-slate-500" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
