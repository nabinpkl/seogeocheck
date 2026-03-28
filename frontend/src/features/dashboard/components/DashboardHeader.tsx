import * as React from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/features/auth/lib/server-auth";

type DashboardHeaderProps = {
  user: AuthUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shadow-sm shadow-black/[0.03] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Mobile Menu Trigger & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
          <Menu className="size-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <div className="hidden sm:flex items-center text-sm font-medium text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer transition-colors">SEOGEO</span>
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground font-semibold">Acme Corp SEO</span>
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search URLs..."
            className="h-9 w-64 rounded-full border border-border/50 bg-muted/20 pl-9 pr-4 text-sm font-medium outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/70"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="hidden min-w-0 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground lg:block">
          {user.email}
        </div>
      </div>
    </header>
  );
}
