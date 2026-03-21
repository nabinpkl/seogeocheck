"use client";

import * as React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/features/marketing/Hero";
import { Features } from "@/features/marketing/Features";
import { CTABanner } from "@/features/marketing/CTABanner";

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <Hero />
      <Features />
      <CTABanner />
      <Footer />
    </main>
  );
}
