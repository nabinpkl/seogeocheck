"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Globe, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuditInputPanelProps = {
  action: (formData: FormData) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  url: string;
  clientError: string | null;
  notice: string | null;
  projectSlug: string | null;
  isPending: boolean;
  isAuditActive: boolean;
  isTyping: boolean;
  onUrlChange: (value: string) => void;
  onExampleAudit: () => void;
  variant?: "hero" | "dashboard";
};

export function AuditInputPanel({
  action,
  onSubmit,
  inputRef,
  url,
  clientError,
  notice,
  projectSlug,
  isPending,
  isAuditActive,
  isTyping,
  onUrlChange,
  onExampleAudit,
  variant = "hero",
}: AuditInputPanelProps) {
  const isDisabled = isPending || isAuditActive || isTyping;
  const isDashboard = variant === "dashboard";

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className={cn(
        "w-full",
        isDashboard ? "mb-6" : "mx-auto max-w-2xl px-4 sm:px-0 mt-16 mb-12"
      )}
    >
      <input type="hidden" name="projectSlug" value={projectSlug ?? ""} />
      <div className="group relative">
        <AnimatePresence>
          {notice ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "absolute left-0 right-0 z-20 flex justify-start px-2",
                clientError ? "-top-20" : "-top-10"
              )}
            >
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 shadow-sm backdrop-blur-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                {notice}
              </div>
            </motion.div>
          ) : null}
          {clientError ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute -top-10 left-0 right-0 z-30 flex justify-start px-2"
            >
              <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-600 shadow-sm backdrop-blur-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                {clientError}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className={cn(
            "relative flex flex-col bg-white transition-all sm:flex-row sm:items-center",
            isDashboard
              ? "rounded-xl border border-slate-200/80 p-1 shadow-sm focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10"
              : "rounded-2xl border border-slate-200 p-1.5 shadow-xl focus-within:ring-4 focus-within:ring-primary/5",
            clientError && "border-rose-300 ring-4 ring-rose-500/10"
          )}
        >
          <div className={cn("flex flex-1 items-center", isDashboard ? "px-3" : "px-4 sm:px-6")}>
            <Globe
              className={cn(
                "transition-colors",
                isDashboard ? "h-4 w-4" : "h-5 w-5",
                clientError
                  ? "text-rose-400"
                  : "text-slate-400 group-focus-within:text-primary"
              )}
            />
            <Input
              ref={inputRef}
              autoFocus={!isDashboard}
              type="text"
              name="url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              disabled={isDisabled}
              placeholder={isDashboard ? "Check any site or page..." : "Enter your website URL (for example, example.com)"}
              className={cn(
                "min-w-0 flex-1 border-0 bg-transparent text-foreground shadow-none focus-visible:border-0 focus-visible:ring-0 font-medium sm:placeholder:text-sm",
                isDashboard ? "h-10 px-3 text-sm" : "h-11 px-3 text-sm sm:text-base"
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={isDisabled}
            className={cn(
              "group/btn relative w-full justify-center gap-2 overflow-hidden whitespace-nowrap text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:hover:scale-100 sm:w-auto",
              isDashboard
                ? "h-10 rounded-lg px-6 shadow-sm min-w-[120px]"
                : "h-11 mt-2 rounded-[10px] px-6 shadow-lg shadow-primary/20 sm:mt-0 min-w-[180px]"
            )}
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transition-transform group-hover/btn:translate-y-0" />
            {isPending ? (
              <>
                <RotateCcw className={cn("animate-spin", isDashboard ? "size-4" : "size-5")} />
                {isDashboard ? "Running..." : "Planning..."}
              </>
            ) : isAuditActive ? (
              <>
                <RotateCcw className={cn("animate-spin", isDashboard ? "size-4" : "size-5")} />
                {isDashboard ? "Running" : "Analyzing"}
              </>
            ) : (
              <>
                {isDashboard ? "Audit Now" : "Analyze Visibility"}
                <ArrowRight className={cn("transition-transform group-hover/btn:translate-x-1", isDashboard ? "size-4" : "size-5")} />
              </>
            )}
          </Button>
        </div>

        {isDashboard ? (
          <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left pl-2">
            Audited site will be added in this project/account.
          </p>
        ) : (
          <div
            className={cn(
              "mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              isDisabled
                ? "pointer-events-none translate-y-1 opacity-0"
                : "translate-y-0 opacity-100"
            )}
          >
            <span className="text-white/20">•</span>
            <span className="text-white/30">Ready to test?</span>
            <Button
              type="button"
              onClick={onExampleAudit}
              disabled={isDisabled}
              variant="link"
              size="sm"
              className="h-auto px-0 decoration-primary/20 underline-offset-4 hover:decoration-primary/50 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 text-white/70 hover:text-white"
            >
              example.com
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
