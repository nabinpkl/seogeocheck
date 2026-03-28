"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  UNDER_CONSTRUCTION_PATH,
} from "@/lib/routes";

type NavbarProps = {
  viewer?: {
    email: string;
  } | null;
};

export function Navbar({ viewer = null }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

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

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "/";
  };

  const isHome = pathname === "/";
  const isLightStyle = isScrolled || !isHome;

  return (
    <header className="sticky top-0 z-50 w-full">
      <AnimatePresence>
        {(isLightStyle || isMobileMenuOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`absolute inset-0 z-0 transition-colors ${
              isScrolled || isMobileMenuOpen ? "border-b" : "border-b-0"
            } ${
              (isScrolled || isMobileMenuOpen) ? (isLightStyle ? "border-slate-200" : "border-white/10") : "border-transparent"
            } ${isScrolled ? "shadow-md" : "shadow-none"}`}
          >
            {/* Navbar Background Image overlay - only on home when not scrolled and menu is open */}
            {isHome && !isScrolled && isMobileMenuOpen && (
              <div className="absolute inset-0">
                <Image 
                  src="/hero-bg.png"
                  alt=""
                  fill
                  priority
                  className="object-cover object-center"
                />
              </div>
            )}
            <div className={`absolute inset-0 backdrop-blur-xl transition-colors ${
              isScrolled || isMobileMenuOpen 
                ? (isLightStyle ? "bg-white/95" : "bg-blue-950/90") 
                : "bg-transparent"
            }`} />
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
        <Link 
          href="/" 
          onClick={handleLogoClick}
          className="flex items-center gap-1 transition-opacity hover:opacity-80"
        >
          <Image 
            src="/logo.png" 
            alt="SEOGEO Logo" 
            width={40} 
            height={40} 
            priority
            className="object-contain" 
          />
          <span className={`font-display text-xl font-bold tracking-tight uppercase transition-colors ${
            isLightStyle ? "text-slate-900" : "text-white"
          }`}>SEOGEO</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <div className="flex items-center gap-8">
            <Link href="/#features" className={`text-sm font-medium transition-colors hover:text-primary ${
              isLightStyle ? "text-slate-600" : "text-white"
            }`}>Features</Link>
            <Link href={UNDER_CONSTRUCTION_PATH} className={`text-sm font-medium transition-colors hover:text-primary ${
              isLightStyle ? "text-slate-600" : "text-white"
            }`}>How it works</Link>
          </div>
          
          <div className={`h-5 w-px transition-colors ${
            isLightStyle ? "bg-slate-200" : "bg-white/10"
          }`} /> {/* Vertical Separator */}

          <div className="flex items-center gap-3">
            {viewer ? (
              <>
                <div
                  className={`hidden rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] lg:block ${
                    isLightStyle
                      ? "border-slate-200 bg-white/80 text-slate-500"
                      : "border-white/20 bg-white/8 text-white/70"
                  }`}
                >
                  {viewer.email}
                </div>
                <Button
                  asChild
                  className="h-10 rounded-xl px-5 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href={DASHBOARD_PATH}>Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  className={
                    isLightStyle
                      ? "h-10 rounded-xl border-slate-200 bg-transparent px-5 text-sm font-semibold text-slate-700 hover:border-primary/50 hover:text-primary"
                      : "h-10 rounded-xl border-white/30 bg-transparent px-5 text-sm font-semibold text-white hover:border-primary/50 hover:bg-white/5 hover:text-primary"
                  }
                >
                  <Link href={SIGN_IN_PATH}>Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="h-10 rounded-xl px-5 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href={SIGN_UP_PATH}>Try For Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className={`h-11 w-11 md:hidden ${
            isLightStyle ? "text-slate-600 hover:text-primary" : "text-white hover:bg-white/5 hover:text-primary"
          }`}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </nav>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative z-20 border-b px-6 pb-5 backdrop-blur-xl md:hidden transition-colors ${
              isLightStyle ? "border-slate-200 bg-white/95" : "border-white/10 bg-blue-950/95"
            }`}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <Link
                href="/#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all hover:bg-white/5 hover:text-primary ${
                  isLightStyle ? "text-slate-700" : "text-white"
                }`}
              >
                Features
              </Link>
              <Link
                href={UNDER_CONSTRUCTION_PATH}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all hover:bg-white/5 hover:text-primary ${
                  isLightStyle ? "text-slate-700" : "text-white"
                }`}
              >
                How it works
              </Link>
              <Button
                asChild
                variant="outline"
                className={
                  isLightStyle
                    ? "h-12 rounded-xl border-slate-200 bg-transparent px-5 text-sm font-semibold text-slate-700 hover:border-primary/50 hover:text-primary"
                    : "h-12 rounded-xl border-white/30 bg-transparent px-5 text-sm font-semibold text-white hover:border-primary/50 hover:bg-white/5 hover:text-primary"
                }
              >
                <Link
                  href={viewer ? DASHBOARD_PATH : SIGN_IN_PATH}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {viewer ? "Dashboard" : "Sign In"}
                </Link>
              </Button>
              {!viewer ? (
                <Button
                  asChild
                  className="h-12 rounded-xl px-5 text-sm font-semibold text-white shadow-md shadow-primary/10 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link
                    href={SIGN_UP_PATH}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Try For Free
                  </Link>
                </Button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
