---
name: ux-designer
description: A logic-based UI/UX design skill for producing professional, buildable, and responsive interfaces. Use this when the user asks for UI specs, design systems, layouts, or high-fidelity component standards.
version: 1.0.0
author: gabeosx
tags: [ui, ux, design-system, responsive-design, frontend]
---

# UX Designer Skill

## 1) Mission and Non-Negotiables
### Mission
Produce UI that looks professional by applying logic-based design rules rather than intuition.
* **Easy to scan:** Clear hierarchy, grouping, and action priority.
* **Consistent:** Systems for spacing, type, color, and elevation.
* **Buildable:** Clean component model, state handling, and responsiveness.

### Non-negotiables
* **Hierarchy is the product:** Control attention: primary is dominant; secondary/tertiary are intentionally quieter.
* **Systems over one-offs:** No arbitrary values.
* **Design all states:** Empty, loading, error, and edge cases are first-class.
* **Responsive is not proportional scaling:** Big elements shrink faster than small ones.
* **Stop Conditions (Do Not Guess):** If the request lacks a clear primary action, user goal, or success metric, **STOP** and ask. 
* **No Native Browser UI:** Never use native `alert()` or `confirm()`. Use design system toasts or styled modals.
* **Safe Destructive Actions:** High-risk actions (delete/archive) must require a styled Dialog with high-contrast "Danger" styling.

---

## 2) Workflow & Decision Procedure
1. **Define Goal:** Identify the primary "One Thing."
2. **Establish Hierarchy:** Decide #1, #2, and #3 priorities.
3. **Apply Systems (Deterministic Algorithm):**
   - **Container Width:** Choose `640px`, `768px`, `1024px`, or `1280px`.
   - **Spacing:** Only use tokens (2, 4, 8, 12, 16, 24, 32...).
   - **Typography:** Only use tokens (`text-xs` to `text-4xl`).
   - **Elevation:** Only use shadow tokens (`shadow-sm` to `shadow-xl`).
4. **Define States:** Explicitly define Loading, Error, and Empty states.
5. **Pixel-Perfect Verification:** Check overflow, alignment (`flex + center`), and responsive stacking.

---

## 3) Responsive Design & Robustness
* **Flex Wrapping:** All horizontal action groups MUST use `flex-wrap gap-2`.
* **Grid Density:** Use the **Rule of 2s** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
* **Defensive Content:** Avoid `whitespace-nowrap` for descriptions; ensure **44x44px** touch targets on mobile.

---

## 4) Data-Dense Interface Principles
* **Widths:** Fixed Width for reading; Full Width for management/dashboards.
* **Numeric Scanability:** Right-align numeric values; use tabular/monospaced numerals.
* **Input Precision:** Use `type="number"` with appropriate `step` values (e.g., `0.01`).

---

## 5) Component Standards
* **Control Heights:** Small: `32px`, Medium: `40px`, Large: `48px`.
* **Disabled States:** Use high-contrast colors (e.g., light gray bg/medium gray text) instead of just lowering opacity.
* **Styling Native Controls:** Use `appearance: none;` on native elements but preserve semantics. Use `pointer-events: none;` for visual overlays like chevrons.

---

## 6) Quality Gate (Self-Correction)
* [ ] No arbitrary pixel values.
* [ ] Primary action is unambiguous.
* [ ] No "border soup" (use spacing/backgrounds instead).
* [ ] Responsive rules are explicit (e.g., "Stack on mobile").
* [ ] Elevation Clearance: No clipping on transformed elements.
* [ ] Specificity: Use the `!` modifier if global resets break utility classes.