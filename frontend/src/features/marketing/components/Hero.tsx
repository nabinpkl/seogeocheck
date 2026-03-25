"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { AuditSection } from "@/features/audit/AuditSection";

export function Hero() {
  return (
    <section className="relative -mt-16 pt-32 pb-16 lg:pt-40 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 z-10 bg-blue-950/95 backdrop-blur-[8px]" />

      <PageShell className="relative z-20 !px-6 !py-0">
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
            <Button
              asChild
              variant="outline"
              className="group mt-6 h-auto rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/oops-under-construction">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px]">🤖</span>
                <span>Learn how to let your agent use our service</span>
                <span className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </Button>
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
              <Card
                key={idx}
                className="group/card rounded-3xl border border-white/10 bg-white/5 py-0 text-center text-white ring-1 ring-white/10 backdrop-blur-sm transition-all hover:translate-y-[-4px] hover:bg-white/10"
              >
                <CardContent className="flex flex-col items-center px-8 py-8">
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl">
                    <Image
                      src={`/illustrations/${item.label.toLowerCase()}.png`}
                      alt={item.title}
                      fill
                      sizes="96px"
                      className="object-contain transition-transform group-hover/card:scale-110"
                    />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-blue-300">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>


        </motion.div>
      </PageShell>
    </section>
  );
}
