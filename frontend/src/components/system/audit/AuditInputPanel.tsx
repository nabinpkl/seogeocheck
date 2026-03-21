"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Globe, RotateCcw } from "lucide-react";

type AuditInputPanelProps = {
  action: (formData: FormData) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  url: string;
  clientError: string | null;
  isPending: boolean;
  isAuditActive: boolean;
  isTyping: boolean;
  onUrlChange: (value: string) => void;
  onExampleAudit: () => void;
};

export function AuditInputPanel({
  action,
  onSubmit,
  inputRef,
  url,
  clientError,
  isPending,
  isAuditActive,
  isTyping,
  onUrlChange,
  onExampleAudit,
}: AuditInputPanelProps) {
  const isDisabled = isPending || isAuditActive || isTyping;

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className="mx-auto mt-16 mb-12 w-full max-w-2xl px-4 sm:px-0"
    >
      <div className="group relative">
        <AnimatePresence>
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
          className={`relative flex flex-col rounded-2xl border bg-white p-1.5 shadow-xl transition-all focus-within:ring-4 focus-within:ring-primary/5 sm:flex-row sm:items-center ${
            clientError ? "border-rose-300 ring-4 ring-rose-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex flex-1 items-center px-4 sm:px-6">
            <Globe
              className={`h-5 w-5 transition-colors ${
                clientError
                  ? "text-rose-400"
                  : "text-slate-400 group-focus-within:text-primary"
              }`}
            />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              name="url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              disabled={isDisabled}
              placeholder="Enter your website URL (e.g. example.com)"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-foreground/35 sm:text-base sm:placeholder:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="group/btn relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-blue-500 disabled:shadow-none disabled:hover:scale-100 sm:mt-0 sm:min-w-[180px] sm:w-auto sm:text-base"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transition-transform group-hover/btn:translate-y-0" />
            {isPending ? (
              <>
                <RotateCcw className="h-5 w-5 animate-spin" />
                Interrogating AI...
              </>
            ) : isAuditActive ? (
              <>
                <RotateCcw className="h-5 w-5 animate-spin" />
                Analyzing Visibility
              </>
            ) : (
              <>
                Analyze Visibility
                <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </div>

        <div
          className={`mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
            isDisabled
              ? "pointer-events-none translate-y-1 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <span className="text-white/20">•</span>
          <span className="text-white/30">Ready to test?</span>
          <button
            type="button"
            onClick={onExampleAudit}
            disabled={isDisabled}
            className="text-white/70 underline decoration-white/20 underline-offset-4 transition-all hover:text-white hover:decoration-white/50 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50"
          >
            example.com
          </button>
        </div>
      </div>
    </form>
  );
}
