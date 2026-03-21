import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Construction } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = {
  title: "Oops, Under Construction | SEOGEO",
  description:
    "This part of SEOGEO is not available yet. Head back to the homepage to continue your audit.",
};

export default function OopsUnderConstructionPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <PageShell className="py-16 sm:py-24">
        <div className="mx-auto flex min-h-[calc(100vh-18rem)] max-w-3xl items-center justify-center">
          <EmptyState
            className="w-full rounded-[2rem] border-border bg-white shadow-2xl shadow-black/5 sm:p-6"
            icon={<Construction className="h-7 w-7" />}
            title="This page is under construction."
            description="We&apos;re still building this part of SEOGEO. The audit experience is live, so you can head back and keep exploring from the homepage."
            action={
              <Button asChild className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02]">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to homepage
                </Link>
              </Button>
            }
          />
        </div>
      </PageShell>
      <Footer />
    </main>
  );
}
