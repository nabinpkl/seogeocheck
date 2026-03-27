import * as React from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Search, 
  Settings, 
  CreditCard, 
  LogOut, 
  Globe,
  Bell,
  Code2
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Projects Overview", href: "/dashboard/projects", icon: LayoutDashboard },
  { name: "Global Roster", href: "/dashboard/urls", icon: Globe },
  { name: "Competitors", href: "/dashboard/competitors", icon: Search },
];

const SETTINGS_ITEMS = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function DashboardSidebar() {
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
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
              JS
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none mb-1">Jane Smith</span>
              <span className="text-xs text-muted-foreground leading-none">Pro Plan</span>
            </div>
          </div>
          <LogOut className="size-4 text-muted-foreground group-hover:text-destructive transition-colors hidden sm:block" />
        </div>
      </div>
    </aside>
  );
}
