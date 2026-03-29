# 🤖 AGENT SPECIFICATIONS (SEOGEO)

This document contains machine-readable rules and technical specifications for AI coding assistants working on the SEOGEO project, as well as the governing principles for the **SEOGEO Agentic Platform**.

---

## 🧠 CORE PHILOSOPHY: USER-AGNOSTIC AGENTIC FLOW

The SEOGEO system is designed to be consumed by both **Humans** and **AI Agents** without differentiation in the underlying execution layer.

1. **Identity Blindness:** The backend does not distinguish between a browser session and an API call from another agent. Both are "System Users" triggering an autonomous workflow.
2. **Iteration-First Delivery:** This project is developed in **vertical slices**. Each iteration should optimize for delivering the next complete slice of value, not for preserving legacy contracts, transitional compatibility layers, or migration scaffolding unless a task explicitly requires them.
3. **Streaming → Result Pattern:** Every request must support:
   - **Progressive Disclosure:** Real-time status/data streams (via SSE).
   - **Durable Finality:** A persistent, immutable JSON/JSON-LD report upon completion.
4. **Agentic Autonomy:** The system behaves as an autonomous agent. Given a URL, it determines the necessary sub-tasks (technical audit, entity extraction, semantic analysis) and executes them via Temporal Workflows.
5. **Mutation → Momentum → Truth:** Audit initiation, streaming progress, and final report retrieval are separate concerns and must stay separate in implementation.

### Delivery Model: Vertical Slices Over Compatibility

- Build the smallest end-to-end slice that makes the system more real.
- Prefer replacing incomplete or fake implementations outright instead of layering compatibility shims around them.
- Backend, frontend, and worker contracts may evolve together within the same iteration when that produces a cleaner vertical slice.
- Do **not** introduce versioned APIs, fallback paths, or compatibility bridges unless the task explicitly calls for them.

---

## 🏗️ CORE ARCHITECTURE: DURABLE TIERED EXECUTION

The sections below describe both the logical execution tiers and the deployment topology.

### Tier 1: The Orchestrator (Hardened Brain)
- **Path:** `backend/`
- **Tech:** Java 25 + Temporal Java SDK + Project Loom.
- **Logic:** Business rules, JSON-LD Entity Depth parsing.
- **Resiliency:** Durable workflows (Temporal).

### Tier 2: Specialized Workers
- **Path:** `seo-audit-worker/` (or worker directories)
- **Tech:** Node.js + Temporal TypeScript SDK + Crawlee + Playwright.
- **Logic:** Custom SEO signal extraction, crawlability checks, metadata checks, and browser-executed comparison checks against the rendered DOM.
- **Normalization Contract:** Node workers must translate raw tool output into SEOGEO-native findings with imperative `instruction` text before results are returned to the orchestrator.
- **Audit Messaging Contract:** For audit checks, `instruction` is the normative guidance or ideal state, while `detail` is the concrete evidence, blocker, or applicability reason. This applies to streamed events and persisted reports. `not_applicable` checks must still set `instruction` so the UI can explain what good would look like once the check becomes relevant.
- **Rule Authoring Pattern:** SEO worker checks must be organized as `collect source HTML evidence -> derive source facts -> collect rendered DOM evidence -> compare surfaces -> evaluate rules -> score packs`. Shared evidence should be collected once per surface and reused across rules; source HTML remains authoritative for fix priority, while rendered evidence adds comparison context and render-dependency risk.

### Current Deployment Topology (Current State)
- **Backend Service (`backend/`):** Currently hosts both API responsibilities (audit start, SSE stream delivery, report retrieval) and Java workflow responsibilities (Temporal orchestration, persistence coordination, report signing).
- **Node Worker Service (`seo-audit-worker/`):** Runs custom SEO-signal extraction and publishes structured worker progress events.
- **Auth Slice (`backend/`):** Email/password auth is implemented in the Java backend with Postgres-backed Spring Session, SMTP-delivered verification and password-reset links, verified-email-required login, CSRF protection on browser-facing auth mutations, and non-mutating verification/reset GET links that only hand off tokens to the frontend.
- **Anonymous Workspace Slice (`backend/` + `frontend/`):** Browser users are bootstrapped into backend-owned anonymous sessions on the first audit start. Anonymous users own audits and projects privately through the same ownership model as email-backed users, may access the dashboard workspace, and can later upgrade in-place to an email account or merge into an existing account in the same browser session.
- **Audit Ownership Slice (`backend/` + `frontend/`):** Audits may start anonymously from the homepage, but authenticated starts must immediately attach the new run to the signed-in account. Persist ownership on `audit_runs.owner_user_id`; once an audit is claimed, report and stream access become owner-only and non-owner access must resolve as `404`.

### Target Worker Topology
- **API Tier:** Owns external HTTP contracts, audit initiation, SSE stream delivery, and final report retrieval.
- **Java Worker Tier:** Owns Temporal workflow orchestration, persistence coordination, report signing.
- **Node Worker Tier:** Owns custom SEO-signal extraction and future specialized crawl/browser activities on dedicated Temporal task queues. Worker-originated progress should be emitted as structured events, not browser-facing streams.
---

## 🚀 PERSISTENCE & FLOW

- **Temporal Agent:** Manages event history (External DB).
- **Redis Agent (Future):** Sliding Window rate-limiting; SSE Buffer.
- **Postgres Agent:** System of Record (Audit Snapshots, User Credits).
- **SSE Agent:** Unidirectional streaming (Java -> Next.js 16).
- **Kafka Progress Bus:** Specialized workers publish structured progress events to Kafka. The Java tier consumes and projects them into the Postgres audit event log, preserving Java ownership of replay, ordering, and user-facing stream semantics.
- **Momentum Pattern:** Momentum is implemented as an append-only Postgres event log with ordered replay and Loom-backed SSE tailing. Kafka is the upstream transport for worker progress, not the user-facing stream itself.
- **Handshake Rule:** The terminal `complete` event must only be emitted after the final report is fully persisted so the frontend can safely switch from live stream state to canonical query state.

### Frontend-to-Backend Audit Contract

#### Phase A: The Mutation (Server Action)
- A human starting an audit from the Next.js application must do so through a **Server Action**.
- The Server Action is the trusted boundary that can hold Java backend signing credentials, HMAC material, or other privileged secrets.
- Its responsibility is to request audit start from the Java backend and return a `jobId`.
- External agents are still allowed to call the backend directly, but they must converge on the same audit-start contract and receive the same durable `jobId` semantics.
- Authentication is a separate backend contract. Human-facing web auth should still cross the trusted Next.js server boundary first when frontend auth UI is introduced, while non-browser agents may call the backend auth API directly if they intentionally handle the same session or future token contract. Browser-facing auth mutations require CSRF tokens. Verification and password-reset email links must not mutate backend state on `GET`; they hand off the one-time token to the frontend using URL fragments, and the actual verification/reset happens on explicit POST. Password reset still follows the same pattern: generic initiation response, one-time hashed reset token, frontend form handoff, and server-side password mutation.

#### Phase B: The Momentum (Zustand + SSE)
- Once the UI has the `jobId`, it must open the SSE stream for that audit.
- In-flight findings, progress events, and live triage data are **ephemeral interaction state** and belong in **Zustand**, not TanStack Query.
- React components should subscribe to Zustand for live streaming updates while the workflow is still active.

#### Phase C: The Truth (TanStack Query)
- When the workflow completes and the signed report is persisted, the frontend must treat that report as **canonical server state**.
- TanStack Query is the owner of the final report fetch, cache lifecycle, and stale/refetch behavior.
- Transition from stream view to report view should clear or retire the ephemeral Zustand stream state once the final report is confirmed.

### Schema-First Contract Rule
- Signed audit reports, projected SSE payloads, and worker progress envelopes must be owned by shared JSON Schema documents under the repository-level `schemas/` directory.
- Node/TypeScript runtimes validate those payloads with Ajv, while the Java tier validates the same schemas with a Java JSON Schema validator before persistence, projection, or signing.
- Local TypeScript and Java wire models should be generated from the shared schemas rather than hand-maintained as separate sources of truth.

---

## 🛠️ TOOLING & CONSTRAINTS

### Backend Requirements
- **Runtime:** Java 25
- **Framework:** Spring Boot 4+
- **Concurrency:** Project Loom (Virtual Threads)
- **Workflow:** Temporal 1.33+

### Frontend Requirements
- **Runtime:** Next.js 16+ (React 19)
- **Styling:** Tailwind CSS 4+
- **Design System Foundation:** shadcn/ui registry primitives in `frontend/src/components/ui` + domain-owned TSX in `frontend/src/features/*`
- **Package Manager:** pnpm
- **Data Fetching:** TanStack Query v5+ (Server State)
- **State Management:** Zustand v5+ (Client State)

### Frontend Design System Rules
- `frontend/src/components/ui` is the source-owned primitive layer. Keep it generic and product-agnostic.
- `frontend/src/features/*` owns domain-specific TSX, controllers, and view-model shaping. Use `frontend/src/features/audit` for audit UI and `frontend/src/features/marketing` for homepage marketing sections.
- Feature folder convention: use concern folders when a feature grows, with `components/` for feature UI and optional `hooks/`, `lib/`, and `types/` only when that feature needs them. Do not create empty placeholder folders just for symmetry.
- `frontend/src/components/layout` owns only global site chrome such as the navbar and footer.
- Frontend naming convention:
   - Feature-owned and layout React component files use PascalCase.
   - Hook files and hook symbols use camelCase with a required `use` prefix (example: `useAuditSectionController.ts`).
   - shadcn/ui primitives and shared UI library modules under `frontend/src/components/ui` use kebab-case file names.
   - Next.js App Router special files follow default Next.js conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`).
- Export convention: named exports are the default across the frontend codebase. Use default exports only when required by Next.js file conventions.
- For new or intentionally rewritten screens, do **not** introduce fresh ad hoc button, input, textarea, badge, card, separator, skeleton, progress, dialog, sheet, tab, tooltip, or accordion patterns when an existing `components/ui` primitive or composition fits.
- When actively refactoring an existing screen, migrate matching ad hoc controls and shells onto `components/ui` primitives or shared compositions instead of preserving raw one-off markup.
- Use the hidden dev-only gallery route at `/internal/design-system` during local development for visual QA of `components/ui` primitives and feature-owned compositions.

### Data Ownership Rules
- These ownership rules operationalize the Phase A/B/C contract above.
- **TanStack Query:** Owns synchronized server data.
- **Zustand:** Owns client-side UI/user state.
- **SSE Stream Payloads:** Treat as transient interaction state until a signed report is persisted.
- **Backend Sessions:** Authenticated browser/server sessions are durable backend state stored in Postgres through Spring Session JDBC, not frontend-managed client state.

---

## 🛡️ SYSTEM CONSTRAINTS (MANDATORY)

1.  **Technical Jargon:** Do NOT expose backend implementation details (Temporal, Sidecars, etc.) in the user-facing UI.
2.  **Safety:** Never run destructive commands (e.g., `rm -rf`) without explicit confirmation unless marked as safe.
3.  **Documentation:** Always update `AGENTS.md` when introducing new core patterns.
4.  **Libraries:** If your version knowledge is stale, perform a web search for the latest documentation.
5.  **Backward Compatibility:** Do not preserve old APIs, schemas, or behavior by default during iterative development. Favor the cleanest current vertical slice unless compatibility is explicitly requested.
6.  **Fresh Docker Rebuild:** After every backend or worker code change, run `docker compose down --volumes` from the repository root. Once that finishes, run `docker compose up --build -d` from the repository root. (IMPORTANT: Do not run this on frontend only change.)

---

## 📂 DIRECTORY MAPPING

- `/backend`: Java 25 source (The Orchestrator).
- `/frontend`: Next.js 16 source (The Human Interface).
- `/seo-audit-worker`: Node.js Temporal worker (SEO Signal Auditor).
- `/docker-compose.yml`: Infrastructure configuration.
- `/AGENTS.md`: THIS FILE (Platform & Coding Source of Truth).
