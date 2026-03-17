import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Construction } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Oops, Under Construction | SEOGEO",
  description:
    "This part of SEOGEO is not available yet. Head back to the homepage to continue your audit.",
};

export default function OopsUnderConstructionPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto flex min-h-[calc(100vh-18rem)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[2rem] border border-border bg-white p-8 shadow-2xl shadow-black/5 sm:p-12">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Construction className="h-7 w-7" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Oops
            </p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
              This page is under construction.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/65">
              We&apos;re still building this part of SEOGEO. The audit experience is live, so
              you can head back and keep exploring from the homepage.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to homepage
              </Link>
            </div>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
