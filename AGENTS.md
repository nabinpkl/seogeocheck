# 🤖 AGENT SPECIFICATIONS (SEOGEO)

This document contains machine-readable rules and technical specifications for AI coding assistants working on the SEOGEO project.

---

## 🏗️ CORE ARCHITECTURE: DURABLE TIERED EXECUTION

### Tier 1: Client-Side Edge (WASM)
- **Path:** `frontend/` (WASM hooks)
- **Tech:** Rust / WASM
- **Logic:** Instant heuristics (Robots.txt, Metadata, H1-H6).
- **Latency Goal:** <500ms startup.

### Tier 2: The Orchestrator (Hardened Brain)
- **Path:** `backend/`
- **Tech:** Java 25 + Temporal Java SDK + Project Loom.
- **Logic:** Business rules, JSON-LD Entity Depth parsing.
- **Resiliency:** Durable workflows (Temporal).

### Tier 3: Specialized Sidecars
- **Path:** `lighthouse/` (or sidecar directories)
- **Tech:** Node.js + Lighthouse SDK.
- **Logic:** Core Web Vitals, programmatic audits.

---

## 🚀 PERSISTENCE & FLOW

- **Temporal Agent:** Manages event history (External DB).
- **Redis Agent:** Sliding Window rate-limiting; SSE Buffer.
- **Postgres Agent:** System of Record (Audit Snapshots, User Credits).
- **SSE Agent:** Unidirectional streaming (Java -> Next.js 16).

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

---

## 🛡️ SYSTEM CONSTRAINTS (MANDATORY)

1.  **Technical Jargon:** Do NOT expose backend implementation details (Temporal, Sidecars, etc.) in the user-facing UI.
2.  **Safety:** Never run destructive commands (e.g., `rm -rf`) without explicit confirmation unless marked as safe.
3.  **Documentation:** Always update `AGENTS.md` when introducing new core patterns.
4.  **Libraries:** If version knowledge is stale, perform a web search for the latest documentation.

---

## 📂 DIRECTORY MAPPING

- `/backend`: Java 25 source.
- `/frontend`: Next.js 16 source.
- `/docker-compose.yml`: Infrastructure configuration.
- `/AGENTS.md`: THIS FILE (Technical Source of Truth).


