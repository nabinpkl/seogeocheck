"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detachAuditFromProjectAction,
} from "@/app/actions/projects";
import { initialAuditProjectActionState } from "@/app/actions/projects-state";

type DetachAuditButtonProps = {
  projectSlug: string;
  jobId: string;
  compact?: boolean;
};

export function DetachAuditButton({
  projectSlug,
  jobId,
  compact = false,
}: DetachAuditButtonProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    detachAuditFromProjectAction,
    initialAuditProjectActionState
  );

  React.useEffect(() => {
    if (!state.ok) {
      return;
    }
    router.refresh();
  }, [router, state.ok]);

  const handleSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this audit and its saved history?")) {
      event.preventDefault();
    }
  }, []);

  return (
    <form action={action} className="contents" onSubmit={handleSubmit}>
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button
        type="submit"
        variant="ghost"
        className={compact ? "h-8 rounded-full px-3 text-xs" : "h-9 rounded-full px-4 text-xs font-semibold"}
        disabled={isPending}
      >
        <Trash2 className="size-4" />
        {isPending ? "Deleting..." : "Delete Audit"}
      </Button>
      {state.error ? (
        <span className="text-xs font-medium text-rose-600">{state.error}</span>
      ) : null}
    </form>
  );
}
