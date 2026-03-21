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
- When planning or implementing, assume **no backward compatibility requirement** by default during this stage of the project.

---

## 🏗️ CORE ARCHITECTURE: DURABLE TIERED EXECUTION

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
- **Rule Authoring Pattern:** SEO worker checks must be organized as `collect source HTML evidence -> derive source facts -> collect rendered DOM evidence -> compare surfaces -> evaluate rules -> score packs`. Shared evidence should be collected once per surface and reused across rules; source HTML remains authoritative for fix priority, while rendered evidence adds comparison context and render-dependency risk.

### Target Worker Topology
- **API Tier:** Owns external HTTP contracts, audit initiation, SSE stream delivery, and final report retrieval.
- **Java Worker Tier:** Owns Temporal workflow orchestration, persistence coordination, report signing, and Java-native extraction such as `jsoup`.
- **Node Worker Tier:** Owns custom SEO-signal extraction and future specialized crawl/browser activities on dedicated Temporal task queues.
- **Current Slice:** The backend currently combines the API tier and Java worker tier, while the SEO audit worker runs as a dedicated Node Temporal worker on its own task queue with a dual-pass `source_html -> rendered_dom -> comparison` flow.
- **Architecture Direction:** The active direction is `API + Java worker + Node worker`, with worker roles independently scalable and specialized crawl work executed through Temporal instead of HTTP wrappers.

---

## 🚀 PERSISTENCE & FLOW

- **Temporal Agent:** Manages event history (External DB).
- **Redis Agent:** Sliding Window rate-limiting; SSE Buffer.
- **Postgres Agent:** System of Record (Audit Snapshots, User Credits).
- **SSE Agent:** Unidirectional streaming (Java -> Next.js 16).
- **Momentum Pattern (Current Slice):** Until Redis is required for fan-out or hot buffering, momentum is implemented as an append-only Postgres event log with ordered replay and Loom-backed SSE tailing.
- **Handshake Rule:** The terminal `complete` event must only be emitted after the final report is fully persisted so the frontend can safely switch from live stream state to canonical query state.

### Frontend-to-Backend Audit Contract

#### Phase A: The Mutation (Server Action)
- A human starting an audit from the Next.js application must do so through a **Server Action**.
- The Server Action is the trusted boundary that can hold Java backend signing credentials, HMAC material, or other privileged secrets.
- Its responsibility is to request audit start from the Java backend and return a `jobId`.
- External agents are still allowed to call the backend directly, but they must converge on the same audit-start contract and receive the same durable `jobId` semantics.

#### Phase B: The Momentum (Zustand + SSE)
- Once the UI has the `jobId`, it must open the SSE stream for that audit.
- In-flight findings, progress events, and live triage data are **ephemeral interaction state** and belong in **Zustand**, not TanStack Query.
- React components should subscribe to Zustand for live streaming updates while the workflow is still active.

#### Phase C: The Truth (TanStack Query)
- When the workflow completes and the signed report is persisted, the frontend must treat that report as **canonical server state**.
- TanStack Query is the owner of the final report fetch, cache lifecycle, and stale/refetch behavior.
- Transition from stream view to report view should clear or retire the ephemeral Zustand stream state once the final report is confirmed.

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
- **Design System Foundation:** shadcn/ui registry primitives in `frontend/src/components/ui` + SEOGEO compositions in `frontend/src/components/system`
- **Package Manager:** pnpm
- **Data Fetching:** TanStack Query v5+ (Server State)
- **State Management:** Zustand v5+ (Client State)

### Frontend Design System Rules
- `frontend/src/components/ui` is the source-owned primitive layer. Keep it generic and product-agnostic.
- `frontend/src/components/system` is the SEOGEO composition layer for repeated product framing such as page shells, status badges, metric cards, empty states, and audit callouts.
- For new or intentionally rewritten screens, do **not** introduce fresh ad hoc button, input, textarea, badge, card, separator, skeleton, progress, dialog, sheet, tab, tooltip, or accordion patterns when an existing system component fits.
- Existing legacy marketing and audit surfaces may remain unchanged until an intentional migration slice touches them.
- Use the hidden dev-only gallery route at `/internal/design-system` during local development for visual QA of primitives and system components.
- Magic UI is deferred until the core design system is stable; when introduced later, keep it additive and decorative rather than foundational for core product UI.

### Data Ownership Rules
- **TanStack Query:** Exclusively owns data synchronized from the server.
- **Zustand:** Exclusively owns client-side UI/user state.
- **Server Actions:** Exclusively own privileged frontend-originating mutations that must not expose backend secrets to the browser.
- **SSE Stream Payloads:** Live and transient until a signed report is persisted; keep them out of the durable query cache.

---

## 🛡️ SYSTEM CONSTRAINTS (MANDATORY)

1.  **Technical Jargon:** Do NOT expose backend implementation details (Temporal, Sidecars, etc.) in the user-facing UI.
2.  **Safety:** Never run destructive commands (e.g., `rm -rf`) without explicit confirmation unless marked as safe.
3.  **Documentation:** Always update `AGENTS.md` when introducing new core patterns.
4.  **Libraries:** If version knowledge is stale, perform a web search for the latest documentation.
6.  **Backward Compatibility:** Do not preserve old APIs, schemas, or behavior by default during iterative development. Favor the cleanest current vertical slice unless compatibility is explicitly requested.
7.  **Fresh Docker Rebuild:** After every code change, run `docker compose down --volumes` from the repository root. Once that finishes, run `docker compose up --build -d` from the repository root so the full stack is rebuilt from a fresh state.

---

## 📂 DIRECTORY MAPPING

- `/backend`: Java 25 source (The Orchestrator).
- `/frontend`: Next.js 16 source (The Human Interface).
- `/seo-audit-worker`: Node.js Temporal worker (SEO Signal Auditor).
- `/docker-compose.yml`: Infrastructure configuration.
- `/AGENTS.md`: THIS FILE (Platform & Coding Source of Truth).
