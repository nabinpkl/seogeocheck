# SEOGEO Architecture: Deliberately Overengineering a Side Project

## Why This Exists

SEOGEO is not trying to be the smallest possible side project.

It is trying to be a believable simulation of the kinds of distributed execution problems that show up in real systems: long-running jobs, mixed runtimes, durable progress, worker isolation, independently scalable execution tiers, and a frontend that can stream in-flight work before switching to a canonical final report.

That is intentional.

This project is being built in public and used as a portfolio piece. The goal is not just to ship a demo that "works on my machine." The goal is to build something I can explain in a blog post, defend in an interview, and evolve in public while talking honestly about the tradeoffs.

That is why the architecture leans harder into Temporal, worker separation, and sidecar isolation than a typical solo project would.

## The Current Slice

Today, SEOGEO is a truly Temporal-native system with a clear separation between orchestration and execution.

The current flow looks like this:

1. **Frontend Server Action:** A trusted boundary that initiates the audit and returns a durable `jobId`.
2. **Next.js frontend:** Opens an SSE stream for the `jobId` and manages progress in Zustand.
3. **Java API Tier:** Receives the mutation, starts a Temporal workflow, and reads the event log to feed the SSE stream.
4. **Java Worker Tier (Orchestrator):** Runs the `AuditWorkflow`, managing state transitions, persistence, and report signing.
5. **Node Worker Tier (SEO Auditor):** A dedicated Temporal worker polling the `seogeo-seo-signals` task queue. It uses Crawlee (CheerioCrawler) to fetch the site, extract signals, and normalize them into SEOGEO-native findings.
6. **Persistence:** Results are stored in Postgres as as immutable signed reports.

The request lifecycle is decoupled from HTTP. Temporal owns execution history, retries, and recovery.

## Why This Shape Matters

SEOGEO is built to demonstrate how distributed systems should handle mixed runtimes and long-running work.

### 1. Mixed-Runtime Excellence
We don't try to make Java do browser work, and we don't try to make Node do heavy business orchestration.
- **Java** owns the "hardened brain": workflows, persistence, and cryptographic signing.
- **Node** owns the "dirty work": crawling, HTML parsing, and signal extraction.

### 2. Dedicated Task Queues
The Java workflow dispatches a `runSeoAudit` activity onto a Node-specific task queue. A Node worker picks it up, performs the crawl, and returns the result. This means:
- **Independent Scaling:** We can scale Node workers (which are memory-heavy due to crawling) separately from Java workers.
- **Durable Handshakes:** If a Node worker crashes mid-crawl, Temporal handles the retry and timeouts at the activity boundary.

### 3. Progressive Disclosure (SSE + Zustand)
The UI doesn't wait for a "Done" response. As the Node worker finds signals, the Java workflow appends events to the database. The API tier tails these events and streams them via SSE. The frontend uses Zustand to show a live "moment-by-moment" view of the audit before switching to TanStack Query for the final canonical report.

## The Evolution of the Slice

Initially, the system used an HTTP sidecar for Crawlee. We replaced that with a **Temporal-native Node worker** to achieve better durability and coarser backpressure control.

The next vertical slices will introduce:
- **Java-native extraction:** Using `jsoup` inside Java activities for deep entity and JSON-LD analysis.
- **Specialized Node workers:** For browser-based rendered DOM inspection (Playwright/Puppeteer).
- **Redis-backed momentum:** For global SSE fan-out as the user base grows.

## Scaling Strategy

### API Scaling
Scale API instances for request throughput and SSE fan-out. A traffic spike on audit creation doesn't impact crawl capacity.

### Java Worker Scaling
Scale based on orchestration pressure: more concurrent workflows, more persistence activity, and more report synthesis.

### Node Worker Scaling
Scale based on crawl demand. Since Node workers are the most resource-intensive (due to the crawler and browser overhead), they can be isolated in dedicated clusters with specific resource limits.

## Important Reality Check: Overengineering Is The Point

For a simple SEO checker, this is more architecture than strictly necessary.

That is okay.

This project is explicitly being used to demonstrate:

- workflow orchestration thinking
- distributed systems design tradeoffs
- tier separation
- scaling models
- durability patterns
- clear ownership of state and execution

The value is not only in the feature. The value is in the explanation.

This architecture gives me room to write honestly about:

- why the first slice used Java activity -> HTTP sidecar
- where that approach starts to bend
- why dedicated worker pools matter
- how mixed-runtime systems can stay coherent

## Failure Modes Worth Talking About

A good architecture writeup is more believable when it admits what can go wrong.

### Chrome Saturation

Crawlee is expensive.

If Node worker concurrency is too high, the machine will thrash under multiple Chrome instances. Temporal makes this easier to manage because Crawlee work can be isolated onto its own queue and tuned independently.

### API/Worker Coupling

If the API also owns heavy execution, scaling becomes muddy. Separating the API tier from the worker tiers makes capacity planning easier to explain and easier to operate.

### Report Finalization Ordering

The final `complete` event must only be emitted after the canonical report is persisted. Otherwise the frontend may switch out of stream mode before the durable report is actually available.

### Mixed Runtime Drift

Java and Node are excellent at different things. The risk is not the split itself. The risk is blurry ownership. That is why the system should draw a hard line:

- Java owns orchestration, persistence, signing, and `jsoup`
- Node owns Crawlee and browser execution

## Where `jsoup` Fits

`jsoup` should be introduced as a Java worker concern, not a Node sidecar concern.

That is the cleanest separation.

Use `jsoup` for:

- raw HTML fetch and parse
- title and meta extraction
- canonical and robots inspection
- heading structure extraction
- structured data discovery
- non-rendered content analysis

Keep browser-driven work in Node for:

- Crawlee
- rendered DOM behavior
- browser automation
- Chrome-based measurements

If a feature needs JavaScript execution, it belongs closer to the Node worker. If it needs server-side HTML understanding and domain rules, it belongs closer to the Java worker.

## Migration Plan

The project does not need a big-bang rewrite. It can move in slices.

### Slice 1: Keep The API Contract Stable

Preserve the existing audit start, SSE stream, and report fetch contracts so the frontend stays aligned with the mutation -> momentum -> truth model.

### Slice 2: Separate API And Java Worker Deployments

Keep the same Java codebase if needed, but allow deployment roles to diverge:

- API mode
- worker mode

That makes the split visible even before introducing a dedicated Node Temporal worker.

### Slice 3: Replace The Crawlee HTTP Boundary With A Node Temporal Worker

Move Crawlee execution behind a Temporal activity implemented by a Node worker on a dedicated task queue.

At that point, the Node tier becomes a real worker, not just a helper service.

### Slice 4: Introduce `jsoup` As A Separate Java Activity

Add Java-native extraction activities so the workflow can compose:

- on-page extraction
- Crawlee technical audit
- final report synthesis

This creates a more realistic multi-stage audit pipeline.

## Final Position

SEOGEO is intentionally overengineered for its current size.

That is not accidental. It is the product strategy for this project.

The architecture is meant to teach, to signal systems thinking, and to create room for honest technical storytelling in public.

The end state is not "a backend that calls Crawlee."

The end state is a durable, mixed-runtime, multi-worker audit platform where:

- the API is the boundary
- Java is the orchestrator
- Node is the browser execution worker
- Postgres is the system of record
- Temporal is the durable coordination layer

That is the version of the project worth explaining.
