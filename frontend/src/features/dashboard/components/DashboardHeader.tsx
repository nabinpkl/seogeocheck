"use client";

import * as React from "react";
import { Bell, Menu, Search, Globe, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import { useProjectStore } from "@/store/use-project-store";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  user: AuthUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { projects, setSelectedProjectId, setHighlightedUrl } = useProjectStore();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const term = searchQuery.toLowerCase();
    const matches: Array<{
      id: string;
      type: "project" | "url";
      projectId: string;
      title: string;
      subtitle?: string;
      highlightTarget?: string;
    }> = [];

    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)) {
        matches.push({ id: `p-${p.id}`, type: "project", projectId: p.id, title: p.name });
      }
      p.sites.forEach((s) => {
        if (s.name.toLowerCase().includes(term) || s.url.toLowerCase().includes(term)) {
          matches.push({ 
            id: `s-${s.id}`,
            type: "url", 
            projectId: p.id, 
            title: s.url, 
            subtitle: `in ${p.name}`, 
            highlightTarget: s.url 
          });
        }
      });
    });
    return matches.slice(0, 6);
  }, [searchQuery, projects]);

  const handleSelectResult = (result: typeof results[0]) => {
    setSelectedProjectId(result.projectId);
    if (result.type === "url" && result.highlightTarget) {
      setHighlightedUrl(result.highlightTarget);
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

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
          <span className="text-foreground font-semibold uppercase tracking-wider text-[11px]">Projects Overview</span>
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block" ref={dropdownRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search URLs / Projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              className={cn(
                "h-9 w-72 border bg-muted/20 pl-9 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/70",
                isDropdownOpen && results.length > 0 
                  ? "rounded-t-2xl border-border/50 border-b-transparent focus:border-border/50 focus:ring-0 shadow-sm bg-white" 
                  : "rounded-full border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              )}
            />
          </div>

          {isDropdownOpen && searchQuery.trim() !== "" && (
            <div className="absolute top-9 left-0 w-full bg-white border border-border/50 border-t-0 rounded-b-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 z-50">
               {results.length > 0 ? (
                 <div className="py-2">
                   {results.map((result) => (
                     <button
                       key={result.id}
                       onClick={() => handleSelectResult(result)}
                       className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3 group transition-colors"
                     >
                        <div className="size-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          {result.type === "url" ? (
                            <Globe className="size-3 text-slate-500 group-hover:text-primary" />
                          ) : (
                            <LayoutDashboard className="size-3 text-slate-500 group-hover:text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-primary">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-slate-300 py-0.5 px-1.5 rounded-sm border border-slate-200">
                          {result.type}
                        </span>
                     </button>
                   ))}
                 </div>
               ) : (
                 <div className="p-4 text-center text-sm text-slate-500 font-medium">
                   No results found for &quot;{searchQuery}&quot;
                 </div>
               )}
            </div>
          )}
        </div>
        
        <div className="relative" ref={notificationsRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "relative text-muted-foreground hover:text-foreground", 
              isNotificationsOpen && "bg-muted text-foreground"
            )}
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
          >
            <Bell className="size-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {isNotificationsOpen && (
            <div className="absolute top-11 right-0 w-80 bg-white border border-border/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
               <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
               </div>
               <div className="p-8 text-center flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <Bell className="size-5 text-slate-300 fill-slate-100" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">You're all caught up!</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="hidden min-w-0 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground lg:block">
          {user.email}
        </div>
      </div>
    </header>
  );
}
