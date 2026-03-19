"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AuditSection } from "./AuditSection";

export function Hero() {
  return (
    <section className="relative -mt-16 pt-32 pb-16 lg:pt-40 lg:pb-24">
      {/* Keep the hero art on a fixed canvas so it does not recrop when audit results expand. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/hero-bg.png"
          alt="Hero Background"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-blue-950/95 backdrop-blur-[8px]" />

      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <h1 className="max-w-5xl font-display text-5xl font-extrabold tracking-tight text-white md:text-7xl">
            Own the future of search.
          </h1>

          <div className="mt-8 flex flex-col items-center">
            <p className="max-w-4xl text-lg text-blue-200 md:text-xl md:leading-relaxed">
              Audit your site to identify visibility gaps so search engines and AI can easily find and recommend you.
            </p>
            <a
              href="/oops-under-construction"
              className="group mt-6 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px]">🤖</span>
              <span>Learn how to let your agent use our service</span>
              <span className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>



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
              <div key={idx} className="group/card flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:bg-white/10 hover:translate-y-[-4px]">
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl">
                  <Image
                    src={`/illustrations/${item.label.toLowerCase()}.png`}
                    alt={item.title}
                    fill
                    className="object-contain transition-transform group-hover/card:scale-110"
                  />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-blue-300">{item.desc}</p>
              </div>
            ))}
          </div>


        </motion.div>
      </div>
    </section>
  );
}
