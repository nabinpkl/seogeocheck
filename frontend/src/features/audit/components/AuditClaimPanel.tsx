"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditClaimPanelProps = {
  message: string;
  signUpHref: string | null;
  signInHref: string | null;
};

export function AuditClaimPanel({
  message,
  signUpHref,
  signInHref,
}: AuditClaimPanelProps) {
  return (
    <div className="relative flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/50 px-2 py-1 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-md">
      <p className="hidden text-[11px] font-medium text-slate-500 lg:block">
        {message}
      </p>
      <Button
        asChild={Boolean(signUpHref)}
        variant="ghost"
        className="h-6 rounded-full px-2.5 text-[11px] font-medium text-slate-500 transition-all hover:bg-transparent hover:text-slate-900 active:scale-95"
      >
        {signUpHref || signInHref ? (
          <Link href={signUpHref ?? signInHref ?? "#"}>
            <Save className="mr-1.5 size-3 opacity-60" />
            Keep across devices
          </Link>
        ) : (
          <span>
            <Save className="mr-1.5 size-3 opacity-60" />
            Keep across devices
          </span>
        )}
      </Button>
    </div>
  );
}
