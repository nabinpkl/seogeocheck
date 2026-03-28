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
    <section className="rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.96))] p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
            <Save className="size-3.5" />
            Save This Audit
          </div>
          <h3 className="text-2xl font-semibold text-slate-950">
            Keep this result and continue into multi-site tracking.
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            Create an account or sign in to attach this audit to your workspace, reopen it later, and keep auditing more pages.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild={Boolean(signUpHref)}
            disabled={loading || !signUpHref}
            className="h-12 rounded-xl px-5 text-sm font-semibold"
          >
            {signUpHref ? (
              <Link href={signUpHref}>
                Create account
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <span>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Create account
              </span>
            )}
          </Button>
          <Button
            asChild={Boolean(signInHref)}
            disabled={loading || !signInHref}
            variant="outline"
            className="h-12 rounded-xl px-5 text-sm font-semibold"
          >
            {signInHref ? <Link href={signInHref}>Sign in instead</Link> : <span>Sign in instead</span>}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
