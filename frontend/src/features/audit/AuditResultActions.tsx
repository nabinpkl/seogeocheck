import * as React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditResultActionsProps = {
  onReAudit: (event?: React.MouseEvent) => void;
  onReset: () => void;
  compact?: boolean;
};

export function AuditResultActions({
  onReAudit,
  onReset,
  compact = false,
}: AuditResultActionsProps) {
  if (compact) {
    return (
      <div className="ml-auto flex shrink-0 items-center overflow-hidden divide-x divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <Button
          type="button"
          onClick={onReAudit}
          variant="ghost"
          className="h-auto rounded-none border-0 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary/70" />
          <span className="hidden sm:inline">Check again</span>
          <span className="sm:hidden">Re-run</span>
        </Button>
        <Button
          type="button"
          onClick={onReset}
          variant="ghost"
          className="h-auto rounded-none border-0 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Audit</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        onClick={onReAudit}
        className="h-14 w-full flex-1 gap-2.5 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95"
      >
        <RefreshCw className="h-4 w-4" />
        Check site again
      </Button>
      <Button
        type="button"
        onClick={onReset}
        variant="outline"
        className="h-14 w-full flex-1 gap-2.5 rounded-xl border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
      >
        <Plus className="h-4 w-4 text-slate-400" />
        Analyze new site
      </Button>
    </div>
  );
}
