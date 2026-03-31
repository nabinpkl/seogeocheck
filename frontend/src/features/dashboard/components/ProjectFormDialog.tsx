"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { initialProjectActionState } from "@/app/actions/projects-state";
import type { DashboardProjectSummary } from "../types/projects";

type ProjectFormDialogProps = {
  mode: "create" | "edit";
  project?: DashboardProjectSummary;
  attachJobId?: string | null;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  defaultName?: string;
};

export function ProjectFormDialog({
  mode,
  project,
  attachJobId = null,
  triggerLabel,
  triggerVariant = "outline",
  triggerClassName,
  defaultName,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const action = mode === "edit" ? updateProjectAction : createProjectAction;
  const [state, formAction, isPending] = useActionState(action, initialProjectActionState);

  React.useEffect(() => {
    if (!state.ok || !state.projectSlug) {
      return;
    }

    setOpen(false);
    router.push(
      mode === "create" && attachJobId
        ? "/dashboard"
        : `/dashboard?project=${encodeURIComponent(state.projectSlug)}`
    );
    router.refresh();
  }, [attachJobId, mode, router, state.ok, state.projectSlug]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          {mode === "create" ? <Plus className="size-4" /> : <Settings2 className="size-4" />}
          {triggerLabel ?? (mode === "create" ? "New Project" : "Edit Project")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle>{mode === "create" ? "Create Project" : "Edit Project"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Group related audits together and keep one clear view of progress for this project."
              : "Update the project name or add notes for your team."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5 px-6 py-5">
          {mode === "edit" ? (
            <input type="hidden" name="projectSlug" value={project?.slug ?? ""} />
          ) : null}
          {attachJobId ? (
            <input type="hidden" name="attachJobId" value={attachJobId} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${mode}-project-name`}>Name</Label>
            <Input
              id={`${mode}-project-name`}
              name="name"
              defaultValue={project?.name ?? defaultName ?? ""}
              placeholder="Customer docs portal"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-project-description`}>Description</Label>
            <Textarea
              id={`${mode}-project-description`}
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="Optional notes about what belongs in this project."
              className="min-h-28 resize-none"
            />
          </div>

          {state.error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
