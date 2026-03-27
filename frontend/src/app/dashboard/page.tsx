import * as React from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Search, Plus, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageShell } from "@/components/ui/page-shell";

// Mock Data
const PROJECT = {
  id: "proj_123",
  name: "Acme Corp SEO Revamp",
  aggregateScore: 82,
  pages: [
    { url: "acmecorp.com/", score: 92, status: "excellent", delta: "+5", id: "audit_001", lastChecked: "2h ago" },
    { url: "acmecorp.com/pricing", score: 71, status: "needs_work", delta: "-12", id: "audit_002", lastChecked: "5h ago" },
    { url: "acmecorp.com/blog", score: 84, status: "good", delta: "+2", id: "audit_003", lastChecked: "1d ago" },
  ],
  competitors: [
    { url: "evilcorp.com/", score: 95 },
    { url: "startup.io/", score: 62 },
  ],
};

export default function DashboardPage({ projectId }: { projectId: string }) {
  return (
    <div className="min-h-screen pb-16">
      <PageShell size="wide" className="pt-12 pb-8">
        
        <h1 className="text-2xl font-bold">Dashboard</h1>

      </PageShell>
    </div>
  );
}
