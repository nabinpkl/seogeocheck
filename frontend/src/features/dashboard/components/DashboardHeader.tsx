"use client";

import * as React from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  user: AuthUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 shadow-sm shadow-black/[0.03] backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground lg:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <div className="hidden sm:block">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Project Workspace
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Projects and new audits
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isNotificationsOpen && "bg-muted text-foreground"
            )}
            onClick={() => setIsNotificationsOpen((value) => !value)}
          >
            <Bell className="size-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 top-11 w-72 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-xl">
              <div className="border-b border-border/40 p-4">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              </div>
              <div className="p-5 text-sm text-slate-600">
                 Audits and account activity will appear here in a later slice.
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden min-w-0 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground lg:block">
          {user.email}
        </div>
      </div>
    </header>
  );
}
