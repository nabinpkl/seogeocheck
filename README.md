# 🌐 SEOGEO

SEOGEO is a next-generation auditing platform designed for the AI age. It checks how well your website is optimized not just for traditional Search Engines (SEO), but also for Generative Engines (GEO) and Answer Engines (AEO).

## ✨ Why SEOGEO?

Modern search is changing. LLMs like Gemini, GPT, and Perplexity "consume" the web differently. SEOGEO provides a **Durable Tiered Execution** model to analyze your site's visibility across all these dimensions.

## 🏗️ How it Works

Our architecture is built for speed and reliability:

1.  **Instant Feedback (The Edge):** We use Rust and WASM to give you immediate meta-data heuristics in under 500ms. No waiting for a spinner.
2.  **The Hardened Brain (Core):** A powerful Java 25 backend powered by **Temporal** ensures that every audit is indestructible. If a network blip happens, the system recovers exactly where it left off.
3.  **Technical Deep-Dive (Sidecars):** We run isolated Node.js environments with the Google Lighthouse SDK to get the technical compliance data Google cares about, without slowing down the rest of the app.

## 🛠️ Tech Stack

- **Backend:** Java 25 (Spring Boot 4, Project Loom)
- **Workflow:** Temporal 1.33+
- **Frontend:** Next.js 16 (React 19), Tailwind 4
- **State:** TanStack Query (Server) & Zustand (Client)
- **Sidecars:** Node.js & Lighthouse

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
This starts PostgreSQL, Temporal, and the Backend API.

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

- `backend/`: Spring Boot service + Temporal workers.
- `frontend/`: Next.js web application.
- `docker-compose.yml`: Core services (Postgres, Temporal, Redis).
- `AGENTS.md`: Machine-readable technical specifications for AI agents.

---

## 🤝 Contributing

We welcome contributions! Please ensure your changes align with the **Durable Tiered Execution** model described above.
