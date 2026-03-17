"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
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
            <div className="absolute inset-0">
              <Image 
                src="/hero-bg.png"
                alt=""
                fill
                priority
                className="object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
        <div className="flex items-center gap-1">
          <Image 
            src="/logo.png" 
            alt="SEOGEO Logo" 
            width={40} 
            height={40} 
            priority
            className="object-contain" 
          />
          <span className="font-display text-xl font-bold tracking-tight text-foreground uppercase">SEOGEO</span>
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
  );
}
