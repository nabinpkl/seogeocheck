import * as React from "react";
import Link from "next/link";
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
      <div className="h-16 flex items-center px-6 border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-2 font-display font-black tracking-tight text-xl">
          <div className="size-6 bg-foreground rounded-md flex items-center justify-center text-background">
            <Code2 className="size-4" />
          </div>
          SEOGEO
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
      <div className="p-4 border-t border-border/40">
        <div className="rounded-lg border border-border/50 bg-background/70 p-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
              {getInitials(user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold leading-none mb-1">{user.email}</span>
              <span className="text-xs text-muted-foreground leading-none">Verified workspace</span>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/60 hover:text-destructive"
            >
              <span>Sign Out</span>
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
