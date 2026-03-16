"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AuditSection } from "./AuditSection";

export function Hero() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/hero-bg.png")' }}
      />
      <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-[2px]" />

      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <h1 className="max-w-4xl font-display text-5xl font-extrabold tracking-tight md:text-7xl">
            Get your website seen by <span className="text-primary italic">AI Search Engines</span>.
          </h1>
          
          <p className="mt-8 max-w-2xl text-lg text-foreground/70 md:text-xl md:leading-relaxed">
            Ensure your business stays visible as search evolution accelerates. We analyze your site's health for traditional search and the new world of generative answer engines.
          </p>

          <AuditSection />

          {/* Explanation Sections: SEO, GEO, AEO */}
          <div className="mt-20 grid w-full gap-8 md:grid-cols-3">
            {[
              {
                label: "SEO",
                title: "Traditional Search",
                desc: "Optimizing your site so people can find you easily on Google and search results."
              },
              {
                label: "GEO",
                title: "AI Search Results",
                desc: "Helping AI models like ChatGPT and Perplexity find and recommend your brand to users."
              },
              {
                label: "AEO",
                title: "Direct Answer Engines",
                desc: "Ensuring your content is clear enough for voice assistants and AI to use as a direct answer."
              }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center rounded-3xl border border-border/50 bg-white/40 p-8 backdrop-blur-sm transition-colors hover:bg-white/60">
                <span className="flex h-10 w-16 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tracking-widest text-primary">
                  {item.label}
                </span>
                <h3 className="mt-6 font-display text-xl font-bold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
