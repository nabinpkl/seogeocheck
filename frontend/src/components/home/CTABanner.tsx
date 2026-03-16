"use client";

import * as React from "react";

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 text-white">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_50%)]" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        <div className="flex flex-col items-center">
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Ready to future-proof your presence?
          </h2>
          <p className="mt-8 max-w-2xl text-xl text-white/80 leading-relaxed">
            Join thousands of brands ensuring they stay discoverable in the age of AI. No complex setup, just clear insights.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="h-16 rounded-2xl bg-white px-10 text-xl font-bold text-primary shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Run a Free Audit
            </button>
            <button className="h-16 rounded-2xl border border-white/30 bg-white/10 px-10 text-xl font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
