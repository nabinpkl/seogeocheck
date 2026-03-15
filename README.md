# SEOGEO

SEOGEO is a distributed, high‑concurrency auditing platform built on a **Polyglot Sidecar Architecture**. It is designed for sub‑second "perceived performance" by offloading heavy industry‑standard audits into containerized sidecars while keeping the core service lightweight and responsive.

---

## 🧠 Architecture (High Level)

### 1) Edge Heuristics (Rust/WASM)
- Runs **local DOM audits** (titles, meta, robots) in the user’s browser.
- Targets <500ms latency for immediate feedback.

### 2) Core Intelligence (Java + Spring Boot + Temporal)
- Orchestrates the audit flow, handles auth/billing, and performs deep JSON‑LD entity graph parsing using **Jsoup**.
- Uses **Java 25 + Project Loom** to handle thousands of concurrent I/O‑bound scraping tasks with minimal hardware.
- Uses **Temporal** for resilient, long‑running workflows.

### 3) Technical Compliance (Node.js Sidecar + Lighthouse)
- Runs programmatic Google Lighthouse audits via a containerized Express API.
- Keeps a warm Chromium to reduce cold‑start latency (3–8s per audit).

### Event Mesh & Streaming
- Real‑time progress updates are streamed via **Server‑Sent Events (SSE)**.
- Temporal is used for distributed worker orchestration with a fan‑out architecture.

### Data Strategy
- **Transient state:** Redis (rate limits, job queues, SSE buffering)
- **Persistent state:** PostgreSQL (users, audit history, stripe transactions)
- **Audit artifacts:** JSON‑LD entity graphs stored in JSONB for flexible querying.

---

## 🛠️ Tech Stack

- **Backend:** Java 25, Spring Boot 4+, Project Loom, Temporal 1.33+
- **Frontend:** Next.js 16+, Tailwind CSS 4+, pnpm
- **Audit Sidecar:** Node.js + Lighthouse SDK
- **Orchestration:** Docker Compose (PostgreSQL, Temporal, Temporal UI, backend)

---

## 🚀 Getting Started (Local)

### Prerequisites
- Docker & Docker Compose (v2+)
- Node.js (recommended: 18+)
- pnpm (pnpm is used in `frontend/`)
- Java 25 (used by backend)

### 1) Configure environment
Copy the provided `.env` and customize any secrets or optional values.

```sh
cp .env.example .env
# EDIT .env as needed (especially OPENROUTER_API_KEY)
```

### 2) Start core services (Postgres + Temporal)

```sh
docker compose up -d
```

This brings up:
- PostgreSQL (data stored in a Docker volume)
- Temporal (server + UI)
- Backend API (Spring Boot)

**Temporal UI:** http://localhost:8081

### 3) Start the frontend

```sh
cd frontend
pnpm install
pnpm dev
```

**Frontend:** http://localhost:3000

---

## 🧪 Running the Backend (Standalone)

From the `backend/` folder:

```sh
./gradlew bootRun
```

The backend listens on port `8080` by default.

---

## 🧩 Project Layout

```
/ (root)
├── backend/          # Spring Boot service + Temporal workers
├── frontend/         # Next.js web UI
├── docker-compose.yml
├── .env              # local development configuration
├── scripts/          # helper scripts (Postgres/Temporal setup)
├── temporalconfig/   # Temporal server configs
└── AGENTS.md         # system overview + tools
```

---

## 🔍 Notes

- **Rate Limiting:** Implemented via Redis sliding window (ZSET).
- **Audit results:** Stored as JSONB for flexibility and improved query performance.

---

## 📌 Useful Commands

| What | Command |
|------|---------|
| Start all services | `docker compose up -d` |
| Tail logs | `docker compose logs -f` |
| Stop all services | `docker compose down` |
| Backend dev | `./gradlew bootRun` (from `backend/`) |
| Frontend dev | `pnpm dev` (from `frontend/`) |

---

## 🤝 Contributing

Feel free to open issues or PRs. Keep changes focused, and make sure critical workflows are covered by tests.
