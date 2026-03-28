"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Globe,
  Settings,
  Archive,
  BarChart3,
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project, Site } from "../types/projects";
import { AuditSection } from "@/features/audit/AuditSection";
import { useAuditStore } from "@/store/use-audit-store";
import { useShallow } from "zustand/react/shallow";
import { startAuditAction } from "@/app/actions/start-audit";
import { initialAuditActionState } from "@/app/actions/start-audit-state";

import { useProjectStore } from "@/store/use-project-store";

export function ProjectDashboard() {
  const { projects, selectedProjectId, setSelectedProjectId, highlightedUrl, setHighlightedUrl } = useProjectStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (highlightedUrl) {
      setTimeout(() => {
        const el = document.getElementById(`site-${highlightedUrl}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2", "transition-all", "duration-500");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
        setHighlightedUrl(null);
      }, 100);
    }
  }, [highlightedUrl, setHighlightedUrl]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const filteredSites = React.useMemo(() => {
    if (!selectedProject) return [];
    if (!searchQuery.trim()) return selectedProject.sites;
    const lowerQuery = searchQuery.toLowerCase();
    return selectedProject.sites.filter(site => 
      site.name.toLowerCase().includes(lowerQuery) || 
      site.url.toLowerCase().includes(lowerQuery)
    );
  }, [selectedProject, searchQuery]);

  // We'll use the audit store to see if an audit is currently running
  const { status, targetUrl, primeAudit, connectToStream } = useAuditStore(
    useShallow((state) => ({
      status: state.status,
      targetUrl: state.targetUrl,
      primeAudit: state.primeAudit,
      connectToStream: state.connectToStream,
    }))
  );

  const [isPending, setIsPending] = React.useState(false);

  const handleSiteAudit = async (siteUrl: string) => {
    if (isPending) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("url", siteUrl);

      const result = await startAuditAction(initialAuditActionState, formData);

      if (result.ok && result.jobId && result.streamUrl && result.reportUrl && result.status) {
        primeAudit({
          jobId: result.jobId,
          targetUrl: result.targetUrl,
          streamUrl: result.streamUrl,
          reportUrl: result.reportUrl,
          status: result.status === "QUEUED" ? "QUEUED" : "STREAMING",
        });
        connectToStream();

        // Scroll to audit section at the bottom so they see it's working
        document.getElementById("audit-section")?.scrollIntoView({ behavior: "smooth" });
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Projects Selection Chips (The main context selector) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-border/40">
        <div className="flex h-9 items-center rounded-xl bg-primary/10 px-3.5 text-[10px] font-black tracking-[0.15em] text-primary uppercase mr-2 border border-primary/20">
          Projects
        </div>
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProjectId(project.id)}
            className={cn(
              "whitespace-nowrap px-4 h-9 rounded-xl text-xs font-bold transition-all border",
              selectedProjectId === project.id
                ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {project.name}
          </button>
        ))}
        <Button variant="outline" size="sm" className="rounded-xl border-dashed border-slate-300 h-9 px-4 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600">
          <Plus className="size-3.5 mr-2" />
          Add Project
        </Button>
      </div>

      {/* 2. Project Sub-Context Header */}
      {selectedProject && (
        <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500 max-w-6xl">
          <div className="w-full space-y-8">
              
              {/* 0. Direct Audit (Simplified inline tool) */}
              <div id="audit-section">
                 <AuditSection variant="dashboard" />
              </div>

              {/* Sites List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 ml-1">
                    <Globe className="size-3.5" />
                    Tracked Sites ({filteredSites.length}{searchQuery && filteredSites.length !== selectedProject.sites.length ? ` / ${selectedProject.sites.length}` : ''})
                  </h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter..." 
                      className="h-8 w-44 pl-9 pr-4 text-xs font-medium rounded-full border border-slate-200 bg-white outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {filteredSites.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      No sites found matching "{searchQuery}"
                    </div>
                  ) : filteredSites.map((site) => (
                    <div id={`site-${site.url}`} key={site.id} className="transition-all duration-500 rounded-xl">
                      <SiteCard
                        site={site}
                        isRunning={status === "STREAMING" && targetUrl === (site.url.startsWith("http") ? site.url : `https://${site.url}`)}
                        onAudit={() => handleSiteAudit(site.url)}
                      />
                    </div>
                  ))}
                  
                  <button className="flex items-center justify-center gap-2 h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all group border border-dashed text-slate-400 hover:text-slate-600 mt-2">
                    <Plus className="size-3.5 transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] transition-colors">Add Site to {selectedProject.name}</span>
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SiteCard({ site, isRunning, onAudit }: { site: Site; isRunning: boolean; onAudit: () => void }) {
  const getScoreColor = (score?: number) => {
    if (!score) return "text-slate-400";
    if (score >= 90) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    return "text-rose-500";
  };

  const getScoreBg = (score?: number) => {
    if (!score) return "bg-slate-100";
    if (score >= 90) return "bg-emerald-50";
    if (score >= 70) return "bg-amber-50";
    return "bg-rose-50";
  };

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 px-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all group min-h-[56px] shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "size-8 rounded-lg flex items-center justify-center shrink-0",
          getScoreBg(site.lastScore),
          getScoreColor(site.lastScore)
        )}>
          <Globe className="size-4" />
        </div>
        <div className="min-w-0 flex flex-col md:flex-row md:items-center md:gap-3">
          <h4 className="font-bold text-sm text-slate-800 truncate">{site.name}</h4>
          <span className="hidden md:block text-slate-200">•</span>
          <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1 group-hover:text-slate-500">
            {site.url}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5 px-3 border-r border-border/40">
           <div className={cn("text-base font-black tabular-nums tracking-tighter", getScoreColor(site.lastScore))}>
             {site.lastScore || "—"}
           </div>
           {site.lastScore && (
             <div className="flex gap-0.5">
               <div className="size-1 rounded-full bg-emerald-500" />
               <div className="size-1 rounded-full bg-emerald-500/30" />
               <div className="size-1 rounded-full bg-emerald-500/30" />
             </div>
           )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 font-bold text-[11px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all hidden sm:flex"
            disabled={!site.lastScore || isRunning}
          >
            <Eye className="size-3" />
            <span className="ml-1.5">View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 font-bold text-[11px] rounded-lg",
              isRunning ? "text-amber-500" : "text-primary hover:bg-primary/5"
            )}
            onClick={onAudit}
            disabled={isRunning}
          >
            {isRunning ? (
              <RotateCcw className="size-3 animate-spin" />
            ) : (
              <Play className="size-3 fill-current" />
            )}
            <span className="ml-1.5">{isRunning ? "Run..." : "Audit"}</span>
          </Button>
          <Button variant="ghost" size="icon" className="size-7 rounded-lg text-slate-400">
            <MoreVertical className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
