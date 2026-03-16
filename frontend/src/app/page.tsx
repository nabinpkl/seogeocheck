"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Globe, ShieldCheck, Zap, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";

type MachineState = "IDLE" | "SCANNING" | "COMPLETE";

export default function Page() {
  const [machineState, setMachineState] = React.useState<MachineState>("IDLE");
  const [url, setUrl] = React.useState("");
  const [score, setScore] = React.useState(0);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const beginScan = (nextUrl: string) => {
    if (!nextUrl.trim()) return;
    const cleanUrl = nextUrl.startsWith("http") ? nextUrl : `https://${nextUrl}`;
    setUrl(cleanUrl);
    setMachineState("SCANNING");
    setLogs(["Connecting to your website..."]);
    setScore(0);

    // Human-friendly logs
    setTimeout(() => {
      setScore(15);
      setLogs(prev => [...prev, "Analyzing page structure and layout...", "Checking mobile accessibility..."]);
    }, 800);

    setTimeout(() => {
      setScore(45);
      setLogs(prev => [...prev, "Reading content for AI search engines...", "Evaluating trustworthiness signals..."]);
    }, 2200);

    setTimeout(() => {
      setScore(82);
      setMachineState("COMPLETE");
      setLogs(prev => [...prev, "Audit complete. Your visibility report is ready."]);
    }, 4500);
  };

  const resetScan = () => {
    setMachineState("IDLE");
    setUrl("");
    setLogs([]);
    setScore(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    beginScan(url);
  };

  const isScanning = machineState === "SCANNING";

  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 w-full">
        <AnimatePresence>
          {isScrolled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 z-0 border-b border-border shadow-md"
            >
              {/* Navbar Background Image overlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url("/hero-bg.png")' }}
              />
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xl" />
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-2">

          <div className="flex items-center gap-1">
            <img src="/logo.png" alt="SEOGEO Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold tracking-tight text-foreground uppercase">SEOGEO</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-foreground/80 transition hover:text-primary">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-foreground/80 transition hover:text-primary">How it works</a>
            </div>
            
            <div className="h-5 w-px bg-border/25" /> {/* Vertical Separator */}

            <div className="flex items-center gap-3">
              <button className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary/50 hover:text-primary">
                Sign In
              </button>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]">
                Try For Free
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section - Pulled up to sit behind the transparent navbar */}
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
            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl">
              Get your website seen by <span className="text-primary italic">AI Search Engines</span>.
            </h1>
            
            <p className="mt-8 max-w-2xl text-lg text-foreground/70 md:text-xl md:leading-relaxed">
              Ensure your business stays visible as search evolution accelerates. We analyze your site's health for traditional search and the new world of generative answer engines.
            </p>

            <form onSubmit={handleSubmit} className="mt-12 w-full max-w-4xl">
              <div className="relative group flex items-center rounded-2xl border border-border bg-white p-2 shadow-2xl shadow-black/5 transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isScanning}
                  placeholder="Enter your website URL (e.g., myshop.com)"
                  className="h-14 w-full bg-transparent px-6 text-lg outline-none placeholder:text-foreground/30"
                />
                <button
                  type="submit"
                  className="h-14 rounded-xl bg-primary px-8 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap min-w-[200px]"
                >
                  {isScanning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <RotateCcw className="h-5 w-5" />
                      </motion.div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Check Visibility
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-3 text-sm font-medium text-foreground/50">
                <span className="flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-primary">
                  Free SEO & AI visibility check
                </span>
                <span className="h-1 w-1 rounded-full bg-foreground/10" />
                <span>Small fee for backlink discovery</span>
              </div>
            </form>

            {/* Explanation Sections: SEO, GEO, AEO */}
            <div className="mt-20 grid w-full gap-8 md:grid-cols-3">
              {[
                {
                  label: "SEO",
                  title: "Traditional Search",
                  desc: "Optimizing your site so people can find you easily on Google and Bing search results."
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
                  <h3 className="mt-6 text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <AnimatePresence>
            {machineState !== "IDLE" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-16 overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
              >
                <div className="grid md:grid-cols-[1fr_300px]">
                  <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${isScanning ? "animate-pulse bg-primary" : "bg-green-500"}`} />
                      <h3 className="font-bold text-foreground/80">Current Audit Status</h3>
                    </div>
                    
                    <div className="mt-8 space-y-4">
                      {logs.map((log, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 text-lg text-foreground/70"
                        >
                          <CheckCircle2 className={`mt-1 h-5 w-5 shrink-0 ${i === logs.length - 1 && isScanning ? "text-primary/40" : "text-green-500"}`} />
                          <span>{log}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-secondary/20 p-8 md:border-l md:border-border">
                    <div className="text-sm font-bold uppercase tracking-widest text-foreground/40">Visibility Score</div>
                    <div className="mt-2 text-7xl font-black text-primary">
                      {score}
                      <span className="text-2xl text-foreground/20">/100</span>
                    </div>
                    {machineState === "COMPLETE" && (
                      <button
                        onClick={resetScan}
                        className="mt-8 rounded-xl border border-primary/20 bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/5"
                      >
                        Run New Check
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Refined Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Advanced insights without the complexity
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/60">
              We go beyond the basics to give you a clear roadmap for improving your digital presence.
            </p>
          </div>

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
              <div key={i} className="group rounded-3xl border border-border p-8 transition-colors hover:border-primary/20 hover:bg-primary/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary transition-colors group-hover:bg-primary group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="mt-4 text-foreground/60 leading-relaxed">{feature.description}</p>
              </div>
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
              <h2 className="text-4xl font-bold tracking-tight text-foreground">
                Your data, visualized for <span className="text-primary">clarity</span>.
              </h2>
              <p className="text-lg leading-relaxed text-foreground/70">
                We transform complex technical signals into a simple, beautiful dashboard. See exactly how your site performs across traditional search engines and emerging AI answer platforms—all in one place.
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

            <div className="relative group overflow-hidden rounded-[2.5rem] border border-border bg-white p-3 shadow-2xl shadow-primary/5 transition-all hover:shadow-primary/10">
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <img 
                src="/illustration.png" 
                alt="SEOGEO Platform Illustration" 
                className="relative z-10 w-full rounded-[1.8rem] object-cover shadow-sm"
              />
            </div>
          </motion.div>

        </div>
      </section>


      {/* CTA Banner Section - Full Width */}
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

      {/* Structured Footer */}
      <footer className="border-t border-border bg-secondary/10 px-6 py-20 pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-1">
                <img src="/logo.png" alt="SEOGEO Logo" className="h-12 w-12 object-contain" />
                <span className="text-2xl font-bold tracking-tight uppercase">SEOGEO</span>
              </div>
              <p className="mt-6 max-w-sm text-lg leading-relaxed text-foreground/60">
                Helping businesses navigate the intersection of traditional search and generative AI.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-bold text-foreground">Company</h4>
              <ul className="mt-6 space-y-4">
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">About Us</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Blog</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Our Mission</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Press Kit</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground">Legal</h4>
              <ul className="mt-6 space-y-4">
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Cookie Policy</a></li>
                <li><a href="https://github.com/nabin/seogeocheck.com" className="text-foreground/60 transition hover:text-primary">GitHub</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground">Contact</h4>
              <ul className="mt-6 space-y-4">
                <li><a href="mailto:support@seogeocheck.com" className="text-foreground/60 transition hover:text-primary">Support</a></li>
                <li><a href="mailto:hello@seogeocheck.com" className="text-foreground/60 transition hover:text-primary">Business</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Help Center</a></li>
                <li><a href="#" className="text-foreground/60 transition hover:text-primary">Status</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-20 flex flex-col items-center justify-between border-t border-border pt-8 text-sm text-foreground/40 md:flex-row">
            <p>© {new Date().getFullYear()} SEOGEO Platform. All rights reserved.</p>
            <div className="mt-4 flex gap-8 md:mt-0 text-foreground/60">
              <span>Security Verified</span>
              <span>Made with ❤️ for Search Evolution</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
