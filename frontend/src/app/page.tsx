"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, ScanSearch, Terminal } from "lucide-react";

type MachineState = "IDLE" | "SCANNING" | "COMPLETE";

const EXAMPLES = [
  { label: "Discord", url: "https://discord.com" },
  { label: "Figma", url: "https://figma.com" },
  { label: "Stripe", url: "https://stripe.com" },
] as const;

export default function Page() {
  const [machineState, setMachineState] = React.useState<MachineState>("IDLE");
  const [url, setUrl] = React.useState("");

  // These will eventually be driven by your Java/WASM backend
  const [score, setScore] = React.useState(0);
  const [logs, setLogs] = React.useState<string[]>([]);

  // Mocking the "WASM Instant Check" -> "Java SSE Stream" flow
  const beginScan = (nextUrl: string) => {
    if (!nextUrl.trim()) return;
    setUrl(nextUrl);
    setMachineState("SCANNING");
    setLogs(["[SYSTEM] Initiating WASM edge-check..."]);
    setScore(0);

    // Simulate WASM instant <500ms hit
    setTimeout(() => {
      setScore(25);
      setLogs(prev => [...prev, "[WASM] Local DOM Check: PASS", "[SYSTEM] Connecting to Java 25 Loom Workers..."]);
    }, 400);

    // Simulate waiting for Lighthouse Sidecar
    setTimeout(() => {
      setScore(60);
      setLogs(prev => [...prev, "[NODE] Lighthouse Sidecar: Entity extraction complete.", "[JAVA] Analyzing JSON-LD schema depth..."]);
    }, 2000);

    // Simulate completion
    setTimeout(() => {
      setScore(88);
      setMachineState("COMPLETE");
      setLogs(prev => [...prev, "[SYSTEM] Audit complete. Review findings below."]);
    }, 3600);
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
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/30">
      <section className="relative border-b border-zinc-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">SG</div>
            <div>
              <div className="text-sm font-semibold tracking-widest text-zinc-900">SEOGEO</div>
              <div className="text-xs text-zinc-500">SEO + GEO check platform</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <a className="rounded-full px-3 py-1.5 transition hover:bg-zinc-100 hover:text-zinc-900" href="#why">Why SEOGEO</a>
            <a className="rounded-full px-3 py-1.5 transition hover:bg-zinc-100 hover:text-zinc-900" href="#audit">Check SEO</a>
            <a
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              href="https://github.com/nabin/seogeocheck.com"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </section>

      <section
        id="hero"
        className="relative border-y border-emerald-100 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(14,165,233,0.14),transparent_36%),linear-gradient(to_bottom,#f0fdf4,#ecfeff)] py-14 md:py-20"
      >
        <div className={`mx-auto grid max-w-6xl gap-10 px-6 ${machineState === "IDLE" ? "" : "lg:grid-cols-2 lg:items-start"}`}>
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Sub-second perceived performance.
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
              Check SEO + GEO signals <span className="text-emerald-600">in seconds</span>
            </h1>

            <p className="max-w-xl text-lg text-zinc-600">
              SEOGEO combines instant edge checks with deep automated validation so your team can improve discoverability across search, answer engine (AEO), and AI results.
            </p>

            <form id="check" onSubmit={handleSubmit} className="relative max-w-xl">
              <ScanSearch className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isScanning}
                placeholder="https://yourbrand.com"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-5 pl-14 pr-36 text-lg text-zinc-900 placeholder-zinc-500 outline-none transition-all focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isScanning || !url}
                className="absolute bottom-2 right-2 top-2 flex items-center gap-2 rounded-xl bg-zinc-900 px-6 font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500"
              >
                {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                {isScanning ? "Analyzing" : "Start check"}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
              <span>Try an example:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => beginScan(ex.url)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {machineState !== "IDLE" && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg">
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Live check preview</span>
                </div>
                <span className="rounded-full border border-zinc-200 px-2 py-0.5">Beta</span>
              </div>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Check score</span>
                    <span className="font-semibold text-zinc-900">{score}/100</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Status</span>
                    <span className="font-semibold text-zinc-900">{machineState.toLowerCase()}</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">
                    {machineState === "SCANNING"
                      ? "Streaming check events in real time."
                      : "Check complete. Scroll down for the full log."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="why" className="relative py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Why SEOGEO?</h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-600">
            Most SEO tools rely on static crawls. SEOGEO is designed for modern search behavior with fast checks, deeper validation, and clear signals your team can act on.
          </p>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="border-l-2 border-emerald-300 pl-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ScanSearch className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">Fast first feedback</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Catch critical SEO and GEO issues immediately so teams can iterate before a full report finishes.
              </p>
            </div>

            <div className="border-l-2 border-sky-300 pl-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">Built for scale</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Get results fast so you can iterate quickly and keep moving.
              </p>
            </div>

            <div className="border-l-2 border-amber-300 pl-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">Actionable outcomes</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Get practical findings mapped to your pages so SEO, content, and engineering teams can move quickly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {machineState !== "IDLE" && (
          <motion.section
            id="audit-log"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative py-10"
          >
            <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[1.1fr_380px]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 font-mono text-sm shadow-lg">
                <div className="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-3 text-zinc-600">
                  <Terminal className="h-4 w-4" />
                  <span>Check stream (SSE)</span>
                </div>
                <div className="flex h-[260px] flex-col gap-2 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className={log.includes("PASS") ? "text-emerald-600" : "text-zinc-700"}>
                      <span className="mr-2 text-zinc-500">{`>`}</span>
                      {log}
                    </div>
                  ))}

                  {isScanning && (
                    <div className="mt-2 flex items-center gap-2 text-zinc-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Awaiting next signal...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
                <span className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-600">SEO + GEO Score</span>
                <div className="text-7xl font-bold tracking-tighter tabular-nums text-zinc-900">
                  {score}
                  <span className="text-3xl text-zinc-500">/100</span>
                </div>
                <p className="mt-4 text-center text-xs text-zinc-600">
                  {machineState === "COMPLETE"
                    ? "Check complete. Run a new URL or revisit the report."
                    : score < 30
                      ? "Analyzing markup..."
                      : score < 70
                        ? "Building the entity graph..."
                        : "Finishing up..."}
                </p>

                {machineState === "COMPLETE" && (
                  <button
                    type="button"
                    onClick={resetScan}
                    className="mt-6 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Run another check
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
