"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Zap, ArrowRight, ShieldCheck, Globe, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export function Features() {
  return (
    <section id="features" className="relative z-10 scroll-mt-24 bg-white py-24">
      <PageShell className="!px-6 !py-0">
        <SectionHeading
          as="h2"
          align="center"
          title="Everything you need to be recommended by AI"
          description="We bridge the gap between technical signals and the generative AI ecosystem."
        />

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {[
            {
              icon: <Zap className="h-6 w-6" />,
              title: "Real-Time Monitoring",
              description: "Watch your visibility signals change in real-time as you update your content and site structure."
            },
            {
              icon: <ArrowRight className="h-6 w-6" />,
              title: "Smart Action Plans",
              description: "Stop guessing. Get a prioritized checklist of exactly what to change to be seen by AI and users."
            },
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              title: "Authority Building",
              description: "Verify your site's trustworthiness signals that AI engines use to decide which sources to cite."
            }
          ].map((feature, i) => (
            <Card
              key={i}
              className="group rounded-3xl border border-border py-0 shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/5"
            >
              <CardContent className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary transition-colors group-hover:bg-primary group-hover:text-white">
                {feature.icon}
              </div>
                <h3 className="mt-6 font-display text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="mt-4 leading-relaxed text-foreground/60">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-24 grid items-center gap-12 lg:grid-cols-2"
        >
          <div className="flex flex-col gap-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-6 w-6" />
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Your recommendation status, <span className="text-primary">visualized</span>.
            </h2>
            <p className="text-lg leading-relaxed text-foreground/70">
              We transform complex technical signals into a simple, beautiful dashboard. See exactly how your site performs across traditional search engines and emerging AI answer platformsall in one place.
            </p>
            <ul className="space-y-4">
              {[
                "Clear, jargon-free visibility reporting",
                "Cross-platform performance tracking",
                "Actionable steps for immediate improvement"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground/80">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="relative group overflow-hidden rounded-[2.5rem] border border-border bg-white p-3 shadow-2xl shadow-primary/5 transition-all hover:shadow-primary/10">
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <Image 
              src="/illustration.png" 
              alt="SEOGEO Platform Illustration" 
              width={600}
              height={400}
              className="relative z-10 w-full rounded-[1.8rem] object-cover shadow-sm"
            />
          </Card>
        </motion.div>
      </PageShell>
    </section>
  );
}
