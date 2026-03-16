

# Project Overview

SEOGEO is a seo(search engine optimization) / geo (generative engine optimization) / aeo (answer engine optimization) checking platform for helping users to check if their website is optimized for search engines and generative ai search engines.


# SEOGEO ARCHITECTURE: DURABLE TIERED EXECUTION (2026)

## 🏗️ 1. The Multi-Tiered "Discovery" Model
The core architecture decouples **latency** from **depth** to optimize for the "Hopper" user.

### Tier 1: The Edge (Client-Side)
- **Tech:** Rust / WASM
- **Logic:** Immediate heuristics (Robots.txt, Metadata, H1-H6 structure).
- **Purpose:** Instant state transition from "Idle" to "Active" in <500ms, providing immediate perceived value.

### Tier 2: The Orchestrator (Backend Core)
- **Tech:** Java 25 + Temporal Java SDK + Project Loom.
- **Logic:** Business rules, Auth, Stripe, and JSON-LD Entity Depth parsing.
- **Purpose:** The "Hardened Brain." It initiates and manages the Durable Workflow, ensuring the system state is always recoverable.

### Tier 3: The Specialized Sidecars (Isolated Environments)
- **Tech:** Node.js + Lighthouse SDK (Headless Chromium).
- **Logic:** Industry-standard SEO category audits, Core Web Vitals, and JS-heavy rendering.
- **Purpose:** Technical compliance. Isolation prevents Chromium memory leaks from affecting the Java core.

---

## 🚀 2. Durable Orchestration (Temporal)

- **Temporal Server:** Acts as the "Virtual Memory." It maintains the event history of every audit.
- **Workflow (Java 25):** The `SeoAuditWorkflow` defines the sequence. It is indestructible; if the server reboots, the workflow resumes at the exact same step.
- **Activities (Polyglot):** - **Activity A (Java):** High-speed scraping and GEO/Entity parsing.
    - **Activity B (Node):** Heavy Lighthouse SDK execution.
- **Resiliency:** Built-in **Exponential Backoff** and **Retries**. If the Node sidecar fails, Temporal re-schedules the work automatically.

---

## 💾 3. State & Persistence Strategy
- **Temporal Internal State:** Manages "In-Flight" variables and workflow history (Stored in Sharded DB).
- **Transient Data (Redis):** - **Ingress Defense:** Leaky Bucket/Sliding Window rate-limiting.
    - **SSE Buffer:** Buffering log signals for the Frontend.
- **Persistent Data (PostgreSQL):** System of Record for finalized Audit Snapshots, User Credits, and Stripe transactions.
- **Communication (SSE):** Unidirectional streaming from the Java API to Next.js 16. The API "observes" the Temporal Workflow and pipes updates to the user.

---

## 🛡️ 4. The "Hardened" Security & Reliability Layer
- **Idempotency:** Activities use a unique Business Key (URL + Timestamp) to ensure re-runs don't double-charge or double-scrape.
- **Circuit Breaker:** If a sidecar is down, the Workflow trips, enters "Graceful Degradation," and completes the audit with only Tier 2 data.
- **Activity Heartbeating:** Monitors long-running scrapers. If a worker hangs, Temporal kills the task and re-assigns it.
- **Infrastructure:** GraalVM Native Images for Java Workers ensure 20ms startup times and minimal memory footprint on Oracle ARM.

---

## 🔄 5. The Senior Execution Summary
1. **Ingress:** Redis-backed rate limiter validates the request.
2. **Edge Check:** WASM provides 500ms "Dopamine" feedback.
3. **Workflow Start:** Temporal starts a stateful, indestructible audit.
4. **Parallel Execution:** Java and Node activities run in isolation.
5. **Streaming:** SSE provides real-time visibility into the durable execution.

# Constraints

- The user interface shouldn't describe about anything related to backend implmentation details. It should be user friendly and easy to use not filled with technical jargons.
- If you don't have knowledege of latest version of libaries search on the internet for docs.


# Folder Structure

backend/
frontend/

# Backend Tools All Latest

- Java 25 
- Spring boot 4+
- Project Loom (Virtual Threads)
- Temporal 1.33+

# Frontend Tools All latest 

- Next JS 16+
- Tailwind css 4+
- pnpm pacakge manager


