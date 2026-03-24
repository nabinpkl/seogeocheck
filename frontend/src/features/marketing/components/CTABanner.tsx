"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { UNDER_CONSTRUCTION_PATH } from "@/lib/routes";

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 text-white">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_50%)]" />
      
      <PageShell className="relative z-10 !px-6 !py-0 text-center">
        <div className="flex flex-col items-center">
          <h2 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Ready to be recommended by AI?
          </h2>
          <p className="mt-8 max-w-2xl text-xl text-white/80 leading-relaxed">
            Join the brands ensuring they stay discoverable in the age of generative search. No complex setup, just clear insights.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="h-16 rounded-xl bg-white px-10 text-xl font-bold text-primary shadow-xl transition-transform hover:scale-[1.03] hover:bg-white active:scale-[0.98]"
            >
              Check My AI Visibility
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-16 rounded-xl border-white/30 bg-white/10 px-10 text-xl font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link href={UNDER_CONSTRUCTION_PATH}>Contact Support</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    </section>
  );
}
