# SEOGEO Architecture: Deliberately Overengineering a Side Project

## Why This Exists

SEOGEO is not trying to be the smallest possible side project.

It is trying to be a believable simulation of the kinds of distributed execution problems that show up in real systems: long-running jobs, mixed runtimes, durable progress, worker isolation, independently scalable execution tiers, and a frontend that can stream in-flight work before switching to a canonical final report.

That is intentional.

This project is being built in public and used as a portfolio piece. The goal is not just to ship a demo that "works on my machine." The goal is to build something I can explain in a blog post, defend in an interview, and evolve in public while talking honestly about the tradeoffs.

That is why the architecture leans harder into Temporal, worker separation, and sidecar isolation than a typical solo project would.

## The Current Slice

Today, SEOGEO already uses Temporal, but only part of the stack is truly Temporal-native.

The current flow looks like this:

1. The API accepts an audit request and returns a durable `jobId`.
2. The Java backend starts a Temporal workflow for that audit.
3. The workflow appends progress events and drives the audit lifecycle.
4. A Java Temporal activity calls the Lighthouse sidecar over HTTP.
5. The Node sidecar launches Chrome, runs Lighthouse, normalizes the result, and returns JSON.
6. The Java worker persists the signed report.
7. The frontend consumes live events over SSE and later fetches the final report as canonical server state.

This is already useful because the request lifecycle is no longer tied to a single HTTP request. Temporal owns the execution history, retries, and recovery semantics. If the backend process dies mid-audit, the workflow state is still durable.

But it is not yet the final shape.

The missing piece is that Lighthouse is still being invoked through an HTTP sidecar, not by a dedicated Temporal worker.

## Why The Current Shape Is Not Enough

The current design is good for the first vertical slice, but it still couples concerns in a way that would become painful as the system grows.

### Coupling Issue 1: API and Worker Live Together

Right now, the backend process is doing two jobs at once:

- serving the external API
- polling Temporal as a worker

That is fine for a small project, but it means scaling the worker tier also scales the API tier whether you need both or not.

### Coupling Issue 2: Lighthouse Is A Tool, Not A Worker

The Lighthouse sidecar is currently an HTTP service that happens to run Chrome locally. That means the Java activity treats it like a remote tool call, not like a first-class Temporal execution tier.

This has consequences:

- backpressure is coarse
- retries happen around the HTTP call, not at a dedicated Node activity boundary
- worker capacity is harder to reason about
- scaling Node execution independently is less explicit

### Coupling Issue 3: Future Analysis Tiers Need Clear Ownership

SEOGEO is not meant to stop at Lighthouse.

Later slices will likely introduce:

- HTML parsing with `jsoup`
- metadata extraction
- JSON-LD and entity analysis
- semantic or LLM-assisted synthesis
- more specialized Node sidecars for browser-based execution

If those capabilities all accumulate inside one backend process or behind ad hoc HTTP calls, the architecture becomes harder to explain and harder to scale.

## The Target Shape

The target topology for SEOGEO is:

- API
- Java worker
- Node worker

Each tier has a different responsibility.

### 1. API Tier

The API tier should be the boundary for external callers.

It is responsible for:

- accepting audit requests
- validating input
- returning durable `jobId` handles
- exposing SSE progress streams
- exposing final report retrieval endpoints

The API tier should not own heavy execution.

It should initiate workflows, read durable state, and stream momentum to the frontend, but it should not be the place where Chrome is launched or deep extraction work is performed.

### 2. Java Worker Tier

The Java worker is the orchestrator tier.

It is responsible for:

- Temporal workflow execution
- durable progress sequencing
- audit state transitions
- report signing
- persistence coordination
- Java-native extraction work such as `jsoup`
- future domain-specific rules and entity parsing

This is the hardened brain of the system.

When `jsoup` is added, it belongs here.

`jsoup` is a Java-native parsing tool and fits naturally into a Java activity such as:

- `fetchHtml`
- `extractOnPageSignals`
- `extractStructuredData`

Those activities should run in the Java worker tier, not inside the Lighthouse sidecar.

### 3. Node Worker Tier

The Node worker is the execution tier for browser-centric and Node-native workloads.

It is responsible for:

- launching Chrome
- running Lighthouse
- normalizing raw Lighthouse data into SEOGEO-native findings
- future browser-based automation or rendered DOM inspection

In the target design, the Node tier should not be a plain HTTP service pretending to be a worker. It should be an actual Temporal worker polling a dedicated task queue such as `seogeo-lighthouse`.

That gives the system a clean separation:

- Java orchestrates
- Node executes browser work

## Why This Is More "Truly Temporal"

Temporal becomes most valuable when execution tiers are modeled as workers, not merely as HTTP services wrapped by activities.

In the target model:

- the Java workflow dispatches a Lighthouse activity onto a Node-specific task queue
- one Node worker replica picks it up
- that worker launches Chrome locally
- it returns a normalized result back through Temporal
- the workflow continues with persistence and report finalization

That means each concern participates in Temporal as a first-class worker boundary.

This is more durable, more explainable, and closer to how real mixed-runtime systems scale.

## How Scaling Works In The Target Model

This is the part that makes the architecture worth talking about in a blog post.

### API Scaling

You can scale API instances for request throughput and SSE fan-out without also scaling execution workers.

That means a traffic spike on audit creation or report reads does not force you to scale Chrome capacity unnecessarily.

### Java Worker Scaling

You can scale Java workers based on orchestration pressure:

- more concurrent workflows
- more persistence activity
- more `jsoup` extraction
- more report synthesis

This is useful because Java worker pressure and Node browser pressure are not the same problem.

### Node Worker Scaling

You can scale Node workers based on Lighthouse demand.

If Chrome execution is the bottleneck, add more Node worker replicas.

Only those replicas need:

- Node runtime
- Lighthouse dependency
- Chrome binary
- browser-specific tuning

The API tier and Java worker tier do not need to carry that weight.

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

Lighthouse is expensive.

If Node worker concurrency is too high, the machine will thrash under multiple Chrome instances. Temporal makes this easier to manage because Lighthouse work can be isolated onto its own queue and tuned independently.

### API/Worker Coupling

If the API also owns heavy execution, scaling becomes muddy. Separating the API tier from the worker tiers makes capacity planning easier to explain and easier to operate.

### Report Finalization Ordering

The final `complete` event must only be emitted after the canonical report is persisted. Otherwise the frontend may switch out of stream mode before the durable report is actually available.

### Mixed Runtime Drift

Java and Node are excellent at different things. The risk is not the split itself. The risk is blurry ownership. That is why the system should draw a hard line:

- Java owns orchestration, persistence, signing, and `jsoup`
- Node owns Lighthouse and browser execution

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

- Lighthouse
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

### Slice 3: Replace The Lighthouse HTTP Boundary With A Node Temporal Worker

Move Lighthouse execution behind a Temporal activity implemented by a Node worker on a dedicated task queue.

At that point, the Node tier becomes a real worker, not just a helper service.

### Slice 4: Introduce `jsoup` As A Separate Java Activity

Add Java-native extraction activities so the workflow can compose:

- on-page extraction
- Lighthouse technical audit
- final report synthesis

This creates a more realistic multi-stage audit pipeline.

## Final Position

SEOGEO is intentionally overengineered for its current size.

That is not accidental. It is the product strategy for this project.

The architecture is meant to teach, to signal systems thinking, and to create room for honest technical storytelling in public.

The end state is not "a backend that calls Lighthouse."

The end state is a durable, mixed-runtime, multi-worker audit platform where:

- the API is the boundary
- Java is the orchestrator
- Node is the browser execution worker
- Postgres is the system of record
- Temporal is the durable coordination layer

That is the version of the project worth explaining.
