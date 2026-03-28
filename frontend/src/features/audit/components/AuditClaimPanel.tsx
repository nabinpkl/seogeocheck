"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditClaimPanelProps = {
  loading: boolean;
  error: string | null;
  signUpHref: string | null;
  signInHref: string | null;
};

export function AuditClaimPanel({
  loading,
  error,
  signUpHref,
  signInHref,
}: AuditClaimPanelProps) {
  return (
    <div className="flex items-center rounded-full border border-slate-200/60 bg-white/50 px-1 py-0.5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-md">
      <Button
        asChild={Boolean(signUpHref)}
        disabled={loading}
        variant="ghost"
        className="h-6 rounded-full px-2.5 text-[11px] font-medium text-slate-500 transition-all hover:bg-transparent hover:text-slate-900 active:scale-95 disabled:opacity-50"
      >
        {signUpHref ? (
          <Link href={signUpHref}>
            {loading ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3 opacity-60" />
            )}
            Monitor this site?
          </Link>
        ) : (
          <span>
            {loading ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3 opacity-60" />
            )}
            Preparing...
          </span>
        )}
      </Button>

      {error ? (
        <p className="absolute -bottom-4 right-0 text-[10px] font-semibold text-rose-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
