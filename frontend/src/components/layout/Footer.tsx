"use client";

import * as React from "react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/10 px-6 py-20 pb-12">
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
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">About Us</a></li>
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Blog</a></li>
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Our Mission</a></li>
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Press Kit</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-foreground">Legal</h4>
            <ul className="mt-6 space-y-4">
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Privacy Policy</a></li>
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Terms of Service</a></li>
              <li><a href="#" className="text-foreground/60 transition hover:text-primary">Cookie Policy</a></li>
              <li><a href="https://github.com/nabin/seogeocheck.com" className="text-foreground/60 transition hover:text-primary">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-foreground">Contact</h4>
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
  );
}
