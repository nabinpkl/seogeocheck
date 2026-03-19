# 🌐 SEOGEO: The Autonomous SEO/GEO Agent

SEOGEO is a next-generation, **agent-first** auditing platform. It behaves as an autonomous SEO/GEO agent that consumes the web to analyze visibility across Search Engines (SEO), Generative Engines (GEO), and Answer Engines (AEO).

## 🤖 Built for Humans & Agents
Our architecture is "Identity Blind." Whether it's a human using the dashboard or another AI agent calling our API, the underlying system provides the same high-fidelity experience:
- **Streaming Intelligence:** Real-time execution updates and partial findings via SSE.
- **Durable Audits:** Final, structured reports that are cryptographically verifiable and durable.
- **Agentic Workflow:** The system supports multi-step reasoning, moving from technical discovery to semantic analysis automatically.

## 🏗️ How it Works

Our architecture is built for autonomous execution and extreme reliability:

1.  **The Hardened Brain (Orchestrator):** A Java 25 backend powered by **Temporal** that manages the agentic state, starts workflows, persists progress, and signs final reports.
2.  **Specialized workers:** Isolated Node.js Temporal workers running custom SEO-signal crawls on their own task queue.

## 🔄 Audit Execution Model

SEOGEO follows a three-phase mutation-to-report flow. In the web app, this begins with a Server Action. External agents may call the backend directly, but they should converge on the same audit-start contract and durable `jobId`.

### Phase A: The Mutation (Server Action)
- The frontend starts an audit through a **Next.js Server Action**, not a direct browser-to-backend fetch.
- This keeps Java signing or HMAC credentials on the server boundary while the frontend asks the backend to start the audit workflow for a target URL.
- The Server Action returns a `jobId` that becomes the durable handle for the audit session.

### Phase B: The Momentum (Zustand + SSE)
- As soon as the UI receives the `jobId`, it opens an **SSE stream** for live audit progress.
- Streaming findings, triage items, and in-flight status updates are treated as **ephemeral client state**.
- **Zustand owns this live stream state** so React 19 components can render immediate progress without polluting the durable server cache.

### Phase C: The Truth (TanStack Query)
- When the backend completes the heavier audit tiers, it persists the final signed report to the system of record.
- The frontend then invalidates or revalidates the relevant query and **TanStack Query refetches the canonical final report**.
- Once the verified report is available, ephemeral Zustand stream state is cleared and the UI transitions from **Streaming** to **Verified Report**.

## 🛠️ Tech Stack

- **Backend:** Java 25 (Spring Boot 4, Project Loom)
- **Workflow:** Temporal 1.33+
- **Frontend:** Next.js 16 (React 19), Tailwind 4
- **State:** TanStack Query (Server) & Zustand (Client)
- **SEO Worker:** Node.js, Crawlee

### SEO Rule Authoring

The SEO audit worker follows an evidence-first rule pipeline:

- collect raw page evidence in `seo-audit-worker/src/audit/`
- derive reusable facts in `seo-audit-worker/src/rules/deriveFacts.js`
- evaluate rules from explicit registries in `seo-audit-worker/src/rules/`
- score the report using ordered audit packs

### State Ownership

- **Server Actions** initiate audits and keep privileged backend credentials off the client.
- **Zustand** owns in-progress audit UX state such as SSE events, transient findings, and live triage.
- **TanStack Query** owns synchronized server data, especially the final persisted audit report and follow-up refetches.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & pnpm
- Java 25

### 1) Spin up the environment
```sh
cp .env.example .env
docker compose up -d
```
This starts PostgreSQL, Temporal, the Backend API, and the SEO audit Temporal worker.

### 2) Launch the Frontend
```sh
cd frontend
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) and start auditing!



---

## 🧪 Advanced Usage

### Running the Backend Standalone
From the `backend/` folder:
```sh
./gradlew bootRun
```
The backend listens on port `8080`.

### Running the SEO Audit Worker Standalone
From the `seo-audit-worker/` folder:
```sh
pnpm install
pnpm start
```
The worker connects to Temporal and polls the SEO signals task queue.

### Useful Commands
| Context | Action | Command |
|---------|--------|---------|
| Infrastructure | Start all | `docker compose up -d` |
| Infrastructure | Stop all | `docker compose down` |
| Monitoring | View logs | `docker compose logs -f` |
| Development | Frontend | `pnpm dev` |
| Development | Backend | `./gradlew bootRun` |

---

## 📂 Project Structure

- `backend/`: Spring Boot API + Java Temporal workflow/activity workers.
- `frontend/`: Next.js web application.
- `seo-audit-worker/`: Node.js Temporal worker for custom SEO signal execution.
- `docker-compose.yml`: Core services and worker topology for Postgres, Temporal, backend, and SEO audit execution.
- `AGENTS.md`: Machine-readable technical specifications for AI agents.

---

## 🤝 Contributing

We welcome contributions! Please ensure your changes align with the **Durable Tiered Execution** model described above.
