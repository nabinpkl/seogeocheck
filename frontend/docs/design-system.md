# SEOGEO Design System

## Purpose
- Establish a source-owned design system for all new frontend work without changing existing marketing or audit UI in this slice.
- Keep `src/components/ui` generic and reusable.
- Keep `src/components/system` specific to SEOGEO product language and repeated business patterns.

## Layering Contract
- `ui/*`: shadcn-based primitives with stable variant props and no SEOGEO-specific copy, iconography, or layout assumptions.
- `system/*`: SEOGEO wrappers and compositions such as page shells, status language, metric framing, empty states, and audit callouts.
- Feature-local components: use only when behavior is unique to a single feature and not yet a repeated pattern.

## Tokens
- Typography:
  - `font-sans`: `Plus Jakarta Sans` for body, forms, and dense UI.
  - `font-display` and `font-heading`: `Space Grotesk` for headlines and section framing.
- Color tokens:
  - Base: `background`, `foreground`, `card`, `popover`, `panel`, `border`, `input`, `ring`.
  - Brand: `primary`, `secondary`, `accent`.
  - Feedback: `destructive`, `success`, `warning`.
  - Supporting: `muted`, `chart-*`, `sidebar-*`.
- Radius:
  - Canonical base radius is `--radius: 1rem`.
  - Derived radii (`sm` through `4xl`) come from that token rather than ad hoc pixel values.

## Spacing, Type, and Elevation
- Prefer tokenized spacing only: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`, `px-4`, `px-6`, `py-4`, `py-6`, `py-10`.
- Keep headline scale intentional:
  - Page title: `text-3xl` to `text-4xl`.
  - Section title: `text-2xl`.
  - Body copy: `text-sm` to `text-lg`.
- Use subtle elevation by default:
  - Foundation cards use `border` plus `shadow-sm`.
  - Reserve heavier shadow or glow treatments for deliberate marketing accents later.

## Motion and Interaction
- Focus-visible rings are required on interactive primitives.
- Loading states should use explicit loading affordances, not opacity-only ambiguity.
- Native `alert()` and `confirm()` remain disallowed; use `Dialog`.
- High-risk actions must use destructive styling and confirmation copy.

## Accessibility States
- Every primitive family must visibly support:
  - default
  - hover
  - focus-visible
  - disabled
  - invalid or destructive where applicable
  - loading, empty, or pending where applicable

## QA Checklist by Primitive Family
- Actions:
  - Buttons wrap on smaller screens and keep a visible focus ring.
  - Destructive actions remain visually distinct from neutral and primary actions.
- Forms:
  - Inputs and textareas show readable placeholder, valid, invalid, and disabled states.
  - Labels stay associated with controls and helper/error text stays legible.
- Status and progress:
  - Badges use semantic tones consistently.
  - Progress bars retain contrast and never collapse below mobile widths.
- Shell and layout:
  - Page shells preserve readable widths.
  - Cards do not clip icons, focus rings, or long content.

## Magic UI Position
- Magic UI is intentionally deferred.
- When introduced later, use it only for additive, decorative, or marketing moments.
- Do not base core navigation, forms, or data-dense product surfaces on Magic UI components.
