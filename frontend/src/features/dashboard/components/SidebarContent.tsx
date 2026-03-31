"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FolderTree, Settings, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { AuthUser } from "@/features/auth/lib/server-auth";

const NAV_ITEMS = [
  { name: "Projects", href: "/dashboard", icon: FolderTree },
];

const SETTINGS_ITEMS = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

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

function getUserLabel(user: AuthUser) {
  return user.email ?? "Guest User";
}

type SidebarContentProps = {
  user: AuthUser;
  onItemClick?: () => void;
};

export function SidebarContent({ user, onItemClick }: SidebarContentProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href || pathname.startsWith("/dashboard/projects") || pathname.startsWith("/dashboard/audits");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const handleLinkClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar overflow-hidden">
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border/40 pt-1">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          onClick={handleLinkClick}
        >
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
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                isActive(item.href)
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
          <div className="mb-2 px-3">
            <p className="text-xs font-black tracking-[0.15em] text-muted-foreground uppercase">Account</p>
            {user.isAnonymous ? (
              <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
                Not available in guest mode.
              </p>
            ) : null}
          </div>
          {SETTINGS_ITEMS.map((item) =>
            user.isAnonymous ? (
              <div
                key={item.name}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground/45"
              >
                <item.icon className="size-4" />
                {item.name}
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.name}
              </Link>
            )
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="mt-auto p-4 shrink-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[13px] text-primary">
              {getInitials(user.email ?? "browser")}
            </div>
            <div className="min-w-0 flex-1 mt-0.5">
              <span className="block truncate text-[15px] font-bold text-slate-900">{getUserLabel(user)}</span>
              {user.isAnonymous ? (
                <span className="block truncate text-xs font-medium text-slate-500">
                  Saved only in browser.
                </span>
              ) : null}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-rose-600 group"
              >
                <LogOut className="size-4 text-slate-400 transition-colors group-hover:text-rose-500" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
