"use client";

import * as React from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState, EmptyStateAction } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuditCallout } from "@/features/audit/AuditCallout";
import { AuditCategoryScoreGrid } from "@/features/audit/AuditCategoryScoreGrid";
import { AuditCheckRow } from "@/features/audit/AuditCheckRow";
import { AuditProgressSidebar } from "@/features/audit/AuditProgressSidebar";
import { AuditResultActions } from "@/features/audit/AuditResultActions";
import { AuditScoreHero } from "@/features/audit/AuditScoreHero";
import { AuditStatusHeader } from "@/features/audit/AuditStatusHeader";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function DesignSystemGallery() {
  const sampleHeaderModel = {
    statusLabel: "READY",
    statusTone: "success" as const,
    targetUrlLabel: "https://seogeocheck.com",
    targetUrlHref: "https://seogeocheck.com",
    title: "Visibility Analysis & Search Intelligence Report",
    titleTone: "default" as const,
    titleIcon: <ShieldCheck className="h-5 w-5 text-primary" />,
    errorMessage: null,
  };

  const sampleIssueRow = {
    id: "gallery-issue-row",
    kind: "issue" as const,
    title: "Primary heading is missing on the source HTML response",
    evidenceSourceLabel: "Source HTML",
    severityLabel: "Critical",
    tone: "critical" as const,
    summaryLabel: "Recommended fix",
    summary:
      "Add a descriptive H1 to the canonical page response so search systems can identify the primary topic immediately.",
    selector: "main > section:nth-child(1)",
    metric: "Heading coverage",
    isHero: true,
  };

  const samplePassedRow = {
    id: "gallery-passed-row",
    kind: "passed" as const,
    title: "Canonical link is present and points to the resolved target",
    evidenceSourceLabel: "Surface Comparison",
    severityLabel: "Passed",
    tone: "success" as const,
    summaryLabel: "What is working",
    summary:
      "The HTML and rendered DOM both expose the same canonical URL, which reduces ambiguity for indexing systems.",
    selector: "head > link[rel='canonical']",
    metric: "Canonical consistency",
  };

  const sampleCategories = [
    { key: "reachability", label: "Reachability", score: 82, tone: "success" as const },
    { key: "metadata", label: "Metadata", score: 61, tone: "info" as const },
    { key: "discovery", label: "Discovery", score: 34, tone: "critical" as const },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PageShell className="pb-4" size="wide">
        <SectionHeading
          eyebrow="Internal"
          title="SEOGEO Design System"
          description="A hidden gallery for visual QA, primitive validation, and feature-owned composition examples. It reflects the shared primitives and promoted compositions that power the current frontend."
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/">Back to homepage</Link>
              </Button>
              <StatusBadge tone="success">Docs live in frontend/docs</StatusBadge>
            </>
          }
        />
      </PageShell>

      <PageShell size="wide" className="pt-4">
        <div className="grid gap-6 xl:grid-cols-3">
          <MetricCard
            label="Adoption Status"
            value="In Use"
            helper="Shared primitives now power production marketing, audit, layout, and utility surfaces instead of staying gallery-only."
            delta="Live"
            deltaDirection="up"
            tone="success"
            icon={<Layers3 className="size-5" />}
          />
          <MetricCard
            label="Retrofit Rule"
            value="Active Screens"
            helper="Screens under active refactor should move matching controls and shells onto shared UI primitives instead of keeping raw one-off markup."
            delta="Locked"
            deltaDirection="flat"
            tone="info"
            icon={<ShieldCheck className="size-5" />}
          />
          <MetricCard
            label="Magic UI"
            value="Deferred"
            helper="Motion-heavy and decorative registry components stay out of the core system until the base layer is stable."
            delta="Later"
            deltaDirection="flat"
            tone="warning"
            icon={<Sparkles className="size-5" />}
          />
        </div>
      </PageShell>

      <PageShell size="wide">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-8">
            <Card className="border border-border shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                  Actions
                </Badge>
                <CardTitle className="font-display text-2xl font-black tracking-tight">
                  Button variants and states
                </CardTitle>
                <CardDescription>
                  Covers primary, quiet, destructive, icon-only, and disabled actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Button>Start audit</Button>
                  <Button variant="outline">View report</Button>
                  <Button variant="secondary">Secondary action</Button>
                  <Button variant="ghost">Ghost action</Button>
                  <Button variant="destructive">Archive</Button>
                  <Button variant="link" className="px-0">
                    Inline docs
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" aria-label="Status">
                    <Activity className="size-4" />
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button aria-busy="true">
                    <Activity className="size-4 animate-spin" />
                    Loading
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                  Forms
                </Badge>
                <CardTitle className="font-display text-2xl font-black tracking-tight">
                  Input, label, textarea, progress, and skeleton
                </CardTitle>
                <CardDescription>
                  Valid, invalid, helper, loading, and progress display states for future audit surfaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="audit-url">Website URL</Label>
                    <Input id="audit-url" defaultValue="https://seogeocheck.com" />
                    <p className="text-sm text-muted-foreground">
                      Canonical input height for future server actions and tool entry points.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audit-url-invalid">Invalid URL</Label>
                    <Input
                      id="audit-url-invalid"
                      aria-invalid="true"
                      defaultValue="not-a-real-url"
                    />
                    <p className="text-sm text-destructive">
                      Validation states should use semantic destructive tokens.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audit-brief">Audit brief</Label>
                  <Textarea
                    id="audit-brief"
                    defaultValue="Focus on indexing gaps, weak metadata, and whether the rendered DOM diverges from the source HTML."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Durable report persistence</span>
                      <span className="text-muted-foreground">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Loading skeleton</div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                  Navigation
                </Badge>
                <CardTitle className="font-display text-2xl font-black tracking-tight">
                  Tabs, accordion, tooltip, dialog, and sheet
                </CardTitle>
                <CardDescription>
                  Interaction primitives for future authenticated product surfaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="findings">Findings</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="rounded-2xl border border-border p-4">
                    Summary content should use shared shells and cards rather than ad hoc wrappers.
                  </TabsContent>
                  <TabsContent value="findings" className="rounded-2xl border border-border p-4">
                    Findings views can compose badges, status cards, and audit callouts.
                  </TabsContent>
                  <TabsContent value="history" className="rounded-2xl border border-border p-4">
                    Temporal history and SSE replay are separate concerns from these UI primitives.
                  </TabsContent>
                </Tabs>

                <Accordion type="single" collapsible className="rounded-2xl border border-border px-4">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Why retrofit existing screens now?</AccordionTrigger>
                    <AccordionContent>
                      The shared layer is no longer just a starter kit. Retrofitting active screens keeps the design system honest by proving it can support real production layouts without a redesign pass.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Why defer Magic UI?</AccordionTrigger>
                    <AccordionContent>
                      Decorative components should remain optional accents until the core input, status, layout, and action language is stable.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex flex-wrap gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Tooltip trigger</Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      Semantic helper copy belongs here, not in browser-native tooltips.
                    </TooltipContent>
                  </Tooltip>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Safe destructive confirmation</DialogTitle>
                        <DialogDescription>
                          High-risk actions should use a styled dialog with destructive affordances rather than native browser prompts.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter showCloseButton>
                        <Button variant="destructive">Archive project</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Open sheet</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Audit navigation</SheetTitle>
                        <SheetDescription>
                          Use sheets for lightweight task flows and mobile navigation, not as a substitute for page structure.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-3 p-4">
                        <StatusBadge tone="info">Streaming</StatusBadge>
                        <StatusBadge tone="success">Verified</StatusBadge>
                        <StatusBadge tone="critical">Needs attention</StatusBadge>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-8">
            <AuditCallout
              title="Source-owned UI and feature ownership"
              description="The `ui/*` layer stays generic. Repeated SEOGEO language such as audit status, empty-result framing, and audit metric tiles belongs in the owning `features/*` folder."
              statusLabel="Governed"
              tone="info"
              meta="Design system rules live in frontend/docs and AGENTS.md."
            />

            <Card className="border border-border shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                  Status
                </Badge>
                <CardTitle className="font-display text-2xl font-black tracking-tight">
                  Badge language
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <StatusBadge tone="neutral">Idle</StatusBadge>
                <StatusBadge tone="info" pulse>
                  Streaming
                </StatusBadge>
                <StatusBadge tone="success">Verified</StatusBadge>
                <StatusBadge tone="warning">Review</StatusBadge>
                <StatusBadge tone="critical">Critical</StatusBadge>
                <StatusBadge tone="pending">Queued</StatusBadge>
              </CardContent>
            </Card>

            <EmptyState
              title="No historical audits yet"
              description="Use this pattern when a server-backed collection is empty. The empty state should guide the next useful action rather than just describing the absence of data."
              icon={<AlertTriangle className="size-6" />}
              action={
                <EmptyStateAction>
                  <CheckCircle2 className="size-4" />
                  Start first audit
                </EmptyStateAction>
              }
            />

            <Card className="border border-border shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                  QA
                </Badge>
                <CardTitle className="font-display text-2xl font-black tracking-tight">
                  Manual verification cues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>Tab through the page and confirm every focus ring is visible against light backgrounds.</p>
                <Separator />
                <p>Resize below `768px` and make sure action rows wrap without clipping or collapsing the card layout.</p>
                <Separator />
                <p>Check the disabled, invalid, loading, and empty states together so the system communicates hierarchy clearly.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageShell>

      <PageShell size="wide" className="pt-0">
        <div className="space-y-8">
          <SectionHeading
            eyebrow="Audit System"
            title="Audit-specific presentation components"
            description="These examples mirror the real audit experience while staying decoupled from raw Zustand and TanStack Query state."
          />

          <AuditStatusHeader
            model={sampleHeaderModel}
            actions={
              <AuditResultActions
                compact
                onReAudit={() => undefined}
                onReset={() => undefined}
              />
            }
          />

          <AuditScoreHero
            reportScore={61}
            issueCount={4}
            passedCheckCount={11}
            onScrollToIssues={() => undefined}
            onScrollToPassed={() => undefined}
          />

          <AuditCategoryScoreGrid categories={sampleCategories} />

          <div className="grid gap-6 xl:grid-cols-[1.2fr_360px]">
            <div className="space-y-4">
              <AuditCheckRow model={sampleIssueRow} />
              <AuditCheckRow model={samplePassedRow} />
              <AuditResultActions
                onReAudit={() => undefined}
                onReset={() => undefined}
              />
            </div>

            <AuditProgressSidebar
              connectionLabel="On"
              hasAuditFailed={false}
              targetUrlLabel="https://seogeocheck.com"
              gapsCount={4}
              signalsCount={11}
              progressValue={72}
              progressLabel="72%"
              progressBarClassName="bg-primary"
              currentStepMessage="Comparing source HTML and rendered DOM"
              operationState="active"
            />
          </div>
        </div>
      </PageShell>
    </main>
  );
}
