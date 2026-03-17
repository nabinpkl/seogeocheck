"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { UNDER_CONSTRUCTION_PATH } from "@/lib/routes";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border bg-secondary/10 px-6 py-20 pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-1">
              <Image 
                src="/logo.png" 
                alt="SEOGEO Logo" 
                width={48} 
                height={48} 
                className="object-contain" 
              />
              <span className="font-display text-2xl font-bold tracking-tight uppercase">SEOGEO</span>
            </div>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-foreground/60">
              Helping businesses navigate the intersection of traditional search and generative AI.
            </p>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-display font-bold text-foreground">Company</h4>
            <ul className="mt-6 space-y-4">
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">About Us</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Blog</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Our Mission</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Press Kit</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-foreground">Legal</h4>
            <ul className="mt-6 space-y-4">
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Privacy Policy</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Terms of Service</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Cookie Policy</Link></li>
              <li><a href="https://github.com/nabinpkl/seogeocheck" className="text-foreground/60 transition hover:text-primary">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-foreground">Contact</h4>
            <ul className="mt-6 space-y-4">
              <li><a href="mailto:support@seogeocheck.com" className="text-foreground/60 transition hover:text-primary">Support</a></li>
              <li><a href="mailto:hello@seogeocheck.com" className="text-foreground/60 transition hover:text-primary">Business</a></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Help Center</Link></li>
              <li><Link href={UNDER_CONSTRUCTION_PATH} className="text-foreground/60 transition hover:text-primary">Status</Link></li>
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
  );
}
