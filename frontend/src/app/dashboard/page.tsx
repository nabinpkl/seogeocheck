import * as React from "react";
import { ArrowRight, BrainCircuit, Inbox, Radar, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { getCurrentUser } from "@/features/auth/lib/server-auth";

const NEXT_STEPS = [
  {
    icon: BrainCircuit,
    title: "Start your first AI visibility audit",
    description: "Use the homepage workflow to audit a public URL and generate the first canonical report.",
  },
  {
    icon: ShieldCheck,
    title: "Set up your workspace",
    description: "Keep your projects organized so your team can review results and track progress over time.",
  },
  {
    icon: Inbox,
    title: "Track key pages and competitors",
    description: "Add important URLs and benchmark domains to monitor visibility changes in one place.",
  },
];

export default async function DashboardPage() {
  const viewer = await getCurrentUser();

  return (
    <div className="min-h-screen pb-16">
      <PageShell size="wide" className="pt-12 pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <Card className="border-border/60 bg-[linear-gradient(135deg,rgba(33,196,132,0.12),rgba(255,255,255,0.96))] shadow-xl shadow-emerald-950/5">
            <CardContent className="space-y-6 p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Radar className="size-3.5" />
                Dashboard
              </div>

              <div className="space-y-3">
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">
                  Welcome back{viewer ? `, ${viewer.email}` : ""}.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  Your workspace is ready. Start a new audit, review what matters most, and turn findings into clear next actions.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {NEXT_STEPS.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-3xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm"
                  >
                    <step.icon className="size-5 text-primary" />
                    <h2 className="mt-4 text-sm font-semibold text-slate-950">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/96 shadow-xl shadow-black/[0.04]">
            <CardHeader className="border-b border-border/70 pb-5">
              <CardTitle className="text-xl text-slate-950">Where to go next</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Build momentum with a first audit run, then expand your tracked pages and competitor set.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Link
                href="/"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/35 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:bg-primary/6 hover:text-slate-950"
              >
                <span>Run a fresh audit from the homepage</span>
                <ArrowRight className="size-4 text-primary" />
              </Link>
              <div className="rounded-2xl border border-border/70 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                This space is designed for ongoing visibility work: run audits, compare outcomes, and keep your optimization queue focused.
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
