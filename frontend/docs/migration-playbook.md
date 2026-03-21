# Migration Playbook

## Phase 1 Rule
- Do not retrofit existing homepage or audit UI in this slice.
- Use the new design-system foundation only for new screens or intentional rewrites.

## Migration Sequence
1. Identify repeated ad hoc patterns in the target screen.
2. Replace primitive families first with `ui/*`.
3. Extract repeated SEOGEO framing into `system/*`.
4. Remove dead utility strings only after the screen is visually stable.
5. Validate responsive, disabled, invalid, loading, and empty states before merging.

## Rewrite Priorities
- New authenticated or dashboard-like product surfaces should adopt the system first.
- Existing marketing surfaces remain a later, optional migration.
- Large handcrafted components should be migrated in slices, not through a single big-bang rewrite.

## Guardrails
- Preserve server-state ownership in TanStack Query and ephemeral interaction state in Zustand.
- Keep user-facing copy free from backend implementation jargon.
- Avoid compatibility layers for half-migrated styles; prefer one clear system per rewritten surface.
- If a future screen needs decorative motion, validate the core experience with system primitives before considering Magic UI.

## Definition of Done for a Migrated Screen
- No new ad hoc primitive clones remain.
- System components cover all repeated patterns.
- Mobile, tablet, and desktop layouts are stable.
- Focus, disabled, error, loading, and empty states are all present and visually coherent.
