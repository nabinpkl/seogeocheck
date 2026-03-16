"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ArrowRight, CheckCircle2 } from "lucide-react";

type MachineState = "IDLE" | "SCANNING" | "COMPLETE";

export function AuditSection() {
  const [machineState, setMachineState] = React.useState<MachineState>("IDLE");
  const [url, setUrl] = React.useState("");
  const [score, setScore] = React.useState(0);
  const [logs, setLogs] = React.useState<string[]>([]);

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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="mt-12 w-full max-w-4xl mx-auto">
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
  );
}
