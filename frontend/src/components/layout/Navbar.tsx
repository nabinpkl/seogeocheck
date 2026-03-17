"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { UNDER_CONSTRUCTION_PATH } from "@/lib/routes";

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <AnimatePresence>
        {(isScrolled || isMobileMenuOpen) && (
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
            <Link href={UNDER_CONSTRUCTION_PATH} className="text-sm font-medium text-foreground/80 transition hover:text-primary">How it works</Link>
          </div>
          
          <div className="h-5 w-px bg-border/25" /> {/* Vertical Separator */}

          <div className="flex items-center gap-3">
            <Link href={UNDER_CONSTRUCTION_PATH} className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary/50 hover:text-primary">
              Sign In
            </Link>
            <Link href={UNDER_CONSTRUCTION_PATH} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]">
              Try For Free
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-primary md:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-20 border-b border-border bg-white/95 px-6 pb-5 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-secondary hover:text-primary"
              >
                Features
              </a>
              <Link
                href={UNDER_CONSTRUCTION_PATH}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-secondary hover:text-primary"
              >
                How it works
              </Link>
              <Link
                href={UNDER_CONSTRUCTION_PATH}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:border-primary/50 hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href={UNDER_CONSTRUCTION_PATH}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Try For Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
