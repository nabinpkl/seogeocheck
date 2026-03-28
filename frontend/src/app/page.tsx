import * as React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/features/marketing/components/Hero";
import { Features } from "@/features/marketing/components/Features";
import { CTABanner } from "@/features/marketing/components/CTABanner";
import { getCurrentUser } from "@/features/auth/lib/server-auth";

export default async function Page() {
  const viewer = await getCurrentUser();

  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <Navbar viewer={viewer} />
      <Hero />
      <Features />
      <CTABanner />
      <Footer />
    </main>
  );
}
