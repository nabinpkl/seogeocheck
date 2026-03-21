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

## Shared Dumb UI
- `ui/PageShell`
- `ui/SectionHeading`
- `ui/MetricCard`
- `ui/StatusBadge`
- `ui/EmptyState`

## Ownership Rules
- If new UI needs a button, card, badge, input, textarea, label, separator, skeleton, progress bar, tooltip, dialog, sheet, tab set, or accordion, start with `ui/*`.
- If an existing screen is being actively refactored and a matching `ui/*` primitive exists, migrate to the shared primitive instead of preserving the raw ad hoc version.
- If a pattern is specific to one business capability or one page family, keep it in the owning `features/*` folder.
- Do not create fresh ad hoc utility-only clones of primitive families once a shared `ui/*` component exists.

## Feature Owners
- `features/audit/*`: audit UI, audit-specific compositions, controllers, and view models
- `features/marketing/*`: homepage marketing sections
- `components/layout/*`: global site chrome only

## Promotion Heuristic
- Keep behavior local if it is unique to one feature.
- Move it to the owning `features/*` folder if it is domain-specific TSX.
- Move it to `ui/*` only if it is product-agnostic and stable across multiple domains.
