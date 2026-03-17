# 🤖 AGENT SPECIFICATIONS (SEOGEO)

This document contains machine-readable rules and technical specifications for AI coding assistants working on the SEOGEO project, as well as the governing principles for the **SEOGEO Agentic Platform**.

---

## 🧠 CORE PHILOSOPHY: USER-AGNOSTIC AGENTIC FLOW

The SEOGEO system is designed to be consumed by both **Humans** and **AI Agents** without differentiation in the underlying execution layer.

1. **Identity Blindness:** The backend does not distinguish between a browser session and an API call from another agent. Both are "System Users" triggering an autonomous workflow.
2. **Streaming → Result Pattern:** Every request must support:
   - **Progressive Disclosure:** Real-time status/data streams (via SSE).
   - **Durable Finality:** A persistent, immutable JSON/JSON-LD report upon completion.
3. **Agentic Autonomy:** The system behaves as an autonomous agent. Given a URL, it determines the necessary sub-tasks (technical audit, entity extraction, semantic analysis) and executes them via Temporal Workflows.
4. **Mutation → Momentum → Truth:** Audit initiation, streaming progress, and final report retrieval are separate concerns and must stay separate in implementation.

---

## 🏗️ CORE ARCHITECTURE: DURABLE TIERED EXECUTION

### Tier 1: The Orchestrator (Hardened Brain)
- **Path:** `backend/`
- **Tech:** Java 25 + Temporal Java SDK + Project Loom.
- **Logic:** Business rules, JSON-LD Entity Depth parsing.
- **Resiliency:** Durable workflows (Temporal).

### Tier 2: Specialized Sidecars
- **Path:** `lighthouse/` (or sidecar directories)
- **Tech:** Node.js + Lighthouse SDK.
- **Logic:** Core Web Vitals, programmatic audits.

---

## 🚀 PERSISTENCE & FLOW

- **Temporal Agent:** Manages event history (External DB).
- **Redis Agent:** Sliding Window rate-limiting; SSE Buffer.
- **Postgres Agent:** System of Record (Audit Snapshots, User Credits).
- **SSE Agent:** Unidirectional streaming (Java -> Next.js 16).

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
- **Package Manager:** pnpm
- **Data Fetching:** TanStack Query v5+ (Server State)
- **State Management:** Zustand v5+ (Client State)

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
5.  **Audit Initiation:** Do not start audits from client-side direct calls when a Server Action boundary is required to protect backend credentials.

---

## 📂 DIRECTORY MAPPING

- `/backend`: Java 25 source (The Orchestrator).
- `/frontend`: Next.js 16 source (The Human Interface).
- `/lighthouse`: Node.js Sidecar (Technical Auditor).
- `/docker-compose.yml`: Infrastructure configuration.
- `/AGENTS.md`: THIS FILE (Platform & Coding Source of Truth).
