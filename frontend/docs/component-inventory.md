# Component Inventory and Ownership

## Foundation Components
- `ui/button`
- `ui/input`
- `ui/textarea`
- `ui/label`
- `ui/card`
- `ui/badge`
- `ui/separator`
- `ui/skeleton`
- `ui/progress`
- `ui/tooltip`
- `ui/dialog`
- `ui/sheet`
- `ui/tabs`
- `ui/accordion`

## SEOGEO System Components
- `system/PageShell`
- `system/SectionHeading`
- `system/MetricCard`
- `system/StatusBadge`
- `system/EmptyState`
- `system/AuditCallout`

## Ownership Rules
- If new UI needs a button, card, badge, input, textarea, label, separator, skeleton, progress bar, tooltip, dialog, sheet, tab set, or accordion, start with `ui/*`.
- If a SEOGEO-specific pattern repeats twice or more, graduate it into `system/*`.
- Do not create fresh ad hoc utility-only clones of primitive families once a system component exists.
- Existing legacy surfaces may remain unchanged until an intentional rewrite touches them.

## What Stays Legacy for Now
- Homepage marketing sections.
- The current homepage navbar and footer.
- The existing `AuditSection` experience.
- The under-construction page, unless it is intentionally redesigned in a future slice.

## Promotion Heuristic
- Keep behavior local if it is unique to one feature.
- Move it to `system/*` if it carries SEOGEO product language or repeated product framing.
- Move it to `ui/*` only if it is product-agnostic and stable across features.
