"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FolderPlus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  attachAuditToProjectAction,
  createProjectAction,
} from "@/app/actions/projects";
import {
  initialAuditProjectActionState,
  initialProjectActionState,
} from "@/app/actions/projects-state";
import type { DashboardAuditSummary } from "../types/audits";
import type { DashboardProjectSummary } from "../types/projects";

type AttachAuditDialogProps = {
  audit: DashboardAuditSummary;
  projects: DashboardProjectSummary[];
  defaultProjectSlug?: string | null;
};

function inferDefaultsFromUrl(targetUrl: string) {
  try {
    const parsed = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`);
    const host = parsed.host.toLowerCase();
    return { name: host };
  } catch {
    return { name: targetUrl };
  }
}

export function AttachAuditDialog({
  audit,
  projects,
  defaultProjectSlug = null,
}: AttachAuditDialogProps) {
  const router = useRouter();
  const defaults = inferDefaultsFromUrl(audit.targetUrl);
  const [open, setOpen] = React.useState(false);
  const [attachState, attachAction, attachPending] = useActionState(
    attachAuditToProjectAction,
    initialAuditProjectActionState
  );
  const [createState, createAction, createPending] = useActionState(
    createProjectAction,
    initialProjectActionState
  );

  React.useEffect(() => {
    if (!attachState.ok) {
      return;
    }
    setOpen(false);
    router.refresh();
  }, [attachState.ok, router]);

  React.useEffect(() => {
    if (!createState.ok) {
      return;
    }
    setOpen(false);
    router.refresh();
  }, [createState.ok, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 rounded-full px-4 text-xs font-semibold">
          <FolderPlus className="size-4" />
          Add to Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle>Add Audit to a Project</DialogTitle>
          <DialogDescription>
            Add this audit to an existing project or create a new one for this work.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="existing" className="px-6 py-5">
          <TabsList
            variant="line"
            className="mb-6 grid h-auto w-full grid-cols-2 rounded-none border-b border-slate-200 bg-transparent p-0"
          >
            <TabsTrigger
              value="existing"
              className="h-12 rounded-none px-4 text-sm font-semibold text-slate-500 after:bg-emerald-500 after:h-[3px] after:bottom-[-1px] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none"
            >
              <Link2 className="size-4" />
              Choose Project
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="h-12 rounded-none px-4 text-sm font-semibold text-slate-500 after:bg-emerald-500 after:h-[3px] after:bottom-[-1px] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none"
            >
              <FolderPlus className="size-4" />
              Create Project
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-0 space-y-5">
            <form action={attachAction} className="space-y-5">
              <input type="hidden" name="jobId" value={audit.jobId} />
              <div className="space-y-2">
                <Label htmlFor={`attach-project-${audit.jobId}`}>Project</Label>
                <div className="relative">
                  <select
                    id={`attach-project-${audit.jobId}`}
                    name="projectSlug"
                    defaultValue={defaultProjectSlug ?? projects[0]?.slug ?? ""}
                    className="flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none ring-offset-background transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    required
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {attachState.error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {attachState.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={attachPending || projects.length === 0}>
                  <Link2 className="size-4" />
                  {attachPending ? "Saving..." : "Save to Project"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="create" className="mt-0 space-y-5">
            <form action={createAction} className="space-y-5">
              <input type="hidden" name="attachJobId" value={audit.jobId} />
              <div className="space-y-2">
                <Label htmlFor={`create-project-name-${audit.jobId}`}>Name</Label>
                <Input
                  id={`create-project-name-${audit.jobId}`}
                  name="name"
                  defaultValue={defaults.name}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`create-project-description-${audit.jobId}`}>Description</Label>
                <Textarea
                  id={`create-project-description-${audit.jobId}`}
                  name="description"
                  placeholder="Optional notes about what belongs in this project."
                  className="min-h-24 resize-none"
                />
              </div>

              {createState.error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {createState.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPending}>
                  {createPending ? "Creating..." : "Create and Save"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
