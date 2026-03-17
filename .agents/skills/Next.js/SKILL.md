---
name: Next.js Performance & Optimization
description: Standards for Next.js image handling, font optimization, and Core Web Vitals.
---

# Next.js Performance Standards

This document outlines the mandatory optimization patterns for Next.js projects to ensure peak performance and excellent Core Web Vitals (LCP, CLS, FID).

## 1. Image Optimization (`next/image`)

Always use the `next/image` component instead of standard `<img>` tags or CSS `background-image` for managed assets.

### The `priority` Prop
- **Requirement:** Add the `priority={true}` prop to any image that is "above the fold" (visible on initial page load without scrolling).
- **Example:**
  ```tsx
  <Image 
    src="/hero.png" 
    alt="Hero Image" 
    width={1200} 
    height={600} 
    priority 
  />
  ```
- **Rationale:** 
  - **LCP Optimization:** Standard Next.js images are lazy-loaded by default. For hero images or logos, lazy-loading delays the "Largest Contentful Paint." Using `priority` tells the browser to preload the image, significantly improving perceived load time and SEO ranking.
  - **Preload Tags:** Next.js automatically injects `<link rel="preload">` tags for prioritized images.

---

## 2. Font Optimization

Ensure all fonts are loaded efficiently to prevent layout shifts and invisible text.

### `font-display: swap`
- **Requirement:** Always use `font-display: swap` in your `@font-face` declarations or within Next.js font loaders.
- **Example (Next.js Fonts):**
  ```ts
  const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
  });
  ```
- **Example (CSS):**
  ```css
  @font-face {
    font-family: 'MyFont';
    src: url('/fonts/myfont.woff2') format('woff2');
    font-display: swap;
  }
  ```
- **Rationale:**
  - **Prevent FOIT (Flash of Invisible Text):** Without `swap`, browsers may hide text until the font is fully loaded. `swap` instructs the browser to use a fallback system font immediately, then swap to the custom font once it arrives.
  - **Core Web Vitals:** Improves the "First Contentful Paint" (FCP) by making content readable instantly.

---

## 3. Best Practices Checklist
- [ ] Use `next/image` for all non-dynamic/external assets.
- [ ] Identify LCP elements and apply `priority`.
- [ ] Verify `font-display: swap` is active for all custom typography.
- [ ] Use `fill` with `object-cover` for responsive background containers instead of CSS `background-image`.
