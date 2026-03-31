import * as React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import type { AuthUser } from "@/features/auth/lib/server-auth";

type AuthPageFrameProps = {
  viewer: AuthUser | null;
  hideSignUpCta?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideDescription?: string;
  bullets?: string[];
  showAside?: boolean;
  minimal?: boolean;
  children: React.ReactNode;
};

export function AuthPageFrame({
  viewer,
  hideSignUpCta = false,
  eyebrow,
  title,
  description,
  asideTitle,
  asideDescription,
  bullets,
  showAside = true,
  minimal = false,
  children,
}: AuthPageFrameProps) {
  if (minimal) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(33,196,132,0.17),transparent_28%),linear-gradient(180deg,#f7fffb_0%,#eef8f5_48%,#f8fbfa_100%)] text-foreground">
        <Navbar viewer={viewer} hideSignUpCta={hideSignUpCta} />
        <PageShell size="wide" className="relative overflow-hidden py-10 sm:py-14 lg:py-18">
          <div className="absolute left-0 top-8 h-48 w-48 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-chart-2/10 blur-3xl" />
          <div className="relative mx-auto w-full max-w-[34rem]">{children}</div>
        </PageShell>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(33,196,132,0.17),transparent_28%),linear-gradient(180deg,#f7fffb_0%,#eef8f5_48%,#f8fbfa_100%)] text-foreground">
      <Navbar viewer={viewer} hideSignUpCta={hideSignUpCta} />
      <PageShell size="wide" className="relative overflow-hidden py-10 sm:py-14 lg:py-18">
        <div className="absolute left-0 top-8 h-48 w-48 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,34rem)] lg:items-start">
          <div className="space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
              {eyebrow}
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-slate-950 sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
            </div>

            {showAside ? (
              <Card className="max-w-xl border-white/70 bg-white/85 shadow-xl shadow-emerald-950/6 backdrop-blur">
                <CardContent className="space-y-5 p-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      {asideTitle}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">{asideDescription}</p>
                  </div>

                  <div className="grid gap-3">
                    {(bullets ?? []).map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="mt-1 size-2 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-24">{children}</div>
        </div>
      </PageShell>
      <Footer />
    </main>
  );
}
