# Scaling Mixed-Runtime Workloads with Temporal, Not Just HTTP Wrappers

Most side projects do not need Temporal.

Most side projects definitely do not need an API tier, a Java worker tier, and a Node worker tier just to run Crawlee(Page crawler) and parse a page.

This one does anyway.

That is partly because SEOGEO is a portfolio project, and partly because I wanted to build a realistic simulation of the kinds of architectural questions that show up in production systems long before a solo project "deserves" them:

- How do you keep long-running work durable?
- How do you scale orchestration separately from browser execution?
- How do you combine Java-native parsing with Node-native tooling without ending up with a pile of ad hoc RPC calls?
- How do you stream progress to a UI while still preserving a canonical final result?

Temporal turns out to be a very good tool for that kind of simulation. But there is an important distinction that I think gets missed in a lot of early integrations:

Using Temporal somewhere in the flow is not the same thing as being structured to scale cleanly with Temporal.

This post is about that gap.

## The Easy First Step: Temporal Around an HTTP Sidecar

The first version of SEOGEO already uses Temporal.

The flow is roughly:

1. An API request starts an audit and returns a durable `jobId`.
2. A Java Temporal workflow takes over orchestration.
3. The workflow appends progress events and manages audit state.
4. A Java activity calls a Node Crawlee sidecar over HTTP.
5. The sidecar launches Chrome, runs Crawlee, normalizes the result, and returns JSON.
6. The Java worker persists the final signed report.

That is already a meaningful upgrade over a simple request-response app.

Temporal gives the system:

- durable workflow state
- retry semantics
- recovery after process crashes
- separation between "start the job" and "finish the job"
- a clean place to model progress and finality

If the Java process dies in the middle of the audit, the execution history does not vanish with it. That matters.

So I do not think "Temporal around an HTTP sidecar" is wrong.

I think it is a very reasonable first slice.

But it starts to show its limits as soon as you care about independent scaling.

## Where the HTTP Wrapper Pattern Starts to Bend

At first glance, wrapping a Node service behind an HTTP call looks fine.

Java wants Crawlee results.
Node is good at Crawlee.
HTTP is simple.

Done.

The problem is that this pattern quietly collapses several different scaling concerns into a single blurry boundary.

### Problem 1: You Can Scale the Caller, But Not the Execution Model

If the Java Temporal worker calls a Crawlee sidecar over HTTP, then scaling Java workers does not automatically give you a clean model for scaling Crawlee capacity.

You can add more Java worker instances, but those workers still funnel Crawlee execution through an external HTTP service. That means the browser-heavy tier is still being treated like a remote dependency, not like a first-class execution pool managed by Temporal.

In other words:

- Java scales as workers
- Crawlee scales as a service endpoint

That is a subtle mismatch.

The more the Node side becomes a real execution tier, the more awkward this split feels.

### Problem 2: Backpressure Becomes Harder to Reason About

Temporal queues are explicit. That is one of their biggest advantages.

A task queue tells you that work is waiting. Workers poll it at a controlled rate. You can scale consumers up or down. You can dedicate queues to different workloads. You can reason about concurrency and ownership more directly.

An HTTP boundary is not like that.

With an HTTP sidecar, backpressure is pushed into a less expressive shape:

- requests pile up
- timeouts start to matter more
- retries happen around RPC calls
- concurrency control becomes application-specific

You can still build those protections, but you are rebuilding behavior that Temporal already wants to give you at the worker boundary.

### Problem 3: Retries Happen at the Wrong Abstraction Layer

If a Java activity calls a Node HTTP service, then retry semantics are attached to the activity that wraps the HTTP call.

That works, but it means the real execution unit is still "call this remote service and hope it responds."

That is weaker than modeling the Node work itself as the activity.

In a more Temporal-native design, the retryable unit is not "send an HTTP request to something that runs Crawlee."

It is "run the Crawlee activity on the Node worker queue."

That is a much better expression of intent.

### Problem 4: Capacity Planning Gets Muddy

Browser work is expensive.

Chrome is not a lightweight dependency. If you run too many Crawlee jobs concurrently on the same machine, performance collapses quickly. CPU spikes, memory climbs, and the machine starts thrashing.

That makes Crawlee capacity different from Java orchestration capacity.

A Java worker can be busy because it is:

- driving workflows
- persisting events
- signing reports
- parsing HTML with `jsoup`

A Node worker can be busy because it is:

- launching Chrome
- waiting on page load
- executing audits
- handling browser-level resource pressure

Those are not the same bottlenecks.

If your architecture treats Node execution as "just another HTTP dependency," it becomes much harder to explain which layer is actually saturated and how to scale it independently.

## What Temporal Is Good At Here

Temporal shines when the system is honest about its execution boundaries.

That means treating each meaningful workload as work owned by workers, not as an opaque network hop hidden inside a generic activity.

For SEOGEO, that leads to a cleaner target model:

- API tier
- Java worker tier
- Node worker tier

Each one scales for a different reason.

## A Better Split: API + Java Worker + Node Worker

This is the architecture I think is worth building, even for a side project.

### API Tier

The API should own the external contract and little else.

Its responsibilities are:

- accept audit requests
- validate input
- return durable `jobId` handles
- expose SSE progress streams
- expose final report retrieval endpoints

This tier does not need Chrome.
It does not need Crawlee.
It should not be doing heavyweight extraction work.

Its job is to be the boundary.

### Java Worker Tier

The Java worker should own orchestration and domain logic.

Its responsibilities are:

- execute Temporal workflows
- coordinate audit state transitions
- append durable progress events
- persist and sign reports
- run Java-native extraction work like `jsoup`
- compose results from multiple analysis stages

This is the durable brain of the system.

It is also the right home for `jsoup`.

That is an important design point. `jsoup` is not a browser automation tool. It is a Java-native HTML parsing library. It belongs with the worker that already owns business rules, persistence coordination, and workflow composition.

If I later add activities like:

- `fetchHtml`
- `extractMetaSignals`
- `extractStructuredData`

those should be Java activities on the Java worker tier.

### Node Worker Tier

The Node worker should own browser-executed technical analysis.

Its responsibilities are:

- launch Chrome
- run Crawlee
- normalize raw output into application-native findings
- eventually support other browser-based checks

The key difference is that this should not just be a Node service exposed over HTTP.

It should be a real Temporal worker polling a dedicated task queue.

For example:

- `seogeo-java`
- `seogeo-Crawlee`

Now the workflow can dispatch work intentionally:

- Java-native activities go to the Java worker queue
- browser-heavy activities go to the Node worker queue

That is the kind of separation that actually makes scaling easier to talk about.

## Why This Scales More Cleanly

The biggest win is not just "it can scale."

The biggest win is "it can scale independently, and the reason why is easy to explain."

### API Scaling

If traffic increases because more users are starting audits or reading reports, I can scale API instances.

That improves:

- request throughput
- SSE fan-out
- response latency for audit creation and report retrieval

It does not force me to scale Chrome capacity.

That is a good separation.

### Java Worker Scaling

If workflow throughput becomes the bottleneck, I can scale Java workers.

That helps when the system is under pressure from:

- many concurrent workflows
- heavy persistence activity
- more report generation
- more HTML extraction via `jsoup`

Again, this does not require scaling browser workers.

### Node Worker Scaling

If Crawlee becomes the bottleneck, I can scale Node workers.

That helps when pressure comes from:

- many concurrent browser audits
- Chrome startup overhead
- expensive page loads
- Crawlee runtime cost

Only the Node worker replicas need:

- Node.js
- Crawlee
- Chrome
- browser-specific tuning

The API tier and Java worker tier do not need any of that baggage.

That is what "independent scaling" actually means in practice. It is not just a sentence in an architecture diagram. It is a statement that each runtime can be scaled for its own bottleneck.

## The Real Value of Temporal in This Design

If I only wanted a queue, I could reach for something simpler.

What makes Temporal compelling here is that it gives the system a durable coordination layer across multiple worker types.

The workflow becomes the stable center of the design.

It knows:

- what stage the audit is in
- what has completed
- what can be retried
- what progress has already been emitted
- when the final report is safe to persist and expose

That is especially useful in a mixed-runtime system.

Java and Node can each do what they are best at, while Temporal owns the durable story of how the overall audit progresses.

This matters because the workflow is not just "calling services." It is modeling a long-running business process.

That is the right level of abstraction.

## Why the HTTP Wrapper Fails to Scale Cleanly

I want to be precise here: the HTTP-wrapper approach can work.

But when people say "we can just scale it," they usually mean "we can add more containers."

That is not the same thing as saying the architecture expresses scaling boundaries well.

The HTTP-wrapper design fails cleanly scaling in a few ways:

### It Hides the Real Execution Tier

The Node service is doing heavy work, but Temporal does not see it as a worker pool. It sees a Java activity making an RPC call.

That makes the Crawlee tier less visible as a first-class execution boundary.

### It Encourages Generic Retries Instead of Work-Specific Retries

Retries get attached to the Java-side wrapper instead of the Node-side activity queue. That is workable, but less expressive and less aligned with the actual workload.

### It Blurs Ownership

Is the bottleneck in:

- the API?
- the Java worker?
- the Node service?
- the network path between them?

With a dedicated worker queue, the answer is often clearer.

### It Couples Observation to RPC Health

HTTP success does not necessarily tell you enough about worker pressure. A queue plus dedicated workers gives a better mental model for backlog, concurrency, and saturation.

## Failure Modes Worth Designing For

One reason I like this architecture as a public project is that it creates room to talk honestly about where things break.

### Chrome Saturation

If too many Crawlee jobs run concurrently, the Node workers will struggle long before the Java workers do. That is exactly why browser execution deserves its own worker tier.

### API and Worker Coupling

If the API also owns worker execution, every scaling decision gets noisier. Traffic spikes and heavy audit workloads get tangled together.

### Finality Ordering

The system should not emit a final "complete" event until the canonical report is actually persisted. Otherwise the UI can race ahead of durable truth.

### Mixed-Runtime Confusion

As soon as a system uses both Java and Node, architecture clarity matters more, not less.

The clean split is:

- Java owns orchestration, durability, business rules, and `jsoup`
- Node owns Crawlee and browser-executed work

That is a much easier system to explain than "there is a backend that sometimes calls a sidecar that sometimes does the heavy thing."

## Why I Think This Is Worth Overengineering

For a small product, this architecture is excessive.

For a build-in-public portfolio project, that is not a bug.

I want the project to show:

- that I can ship a vertical slice
- that I understand where the first slice bends
- that I can describe an evolution path without pretending the first version was perfect
- that I can reason about scaling boundaries before real traffic forces the issue

That is part of the point.

A good side project does not only demonstrate implementation skill.

It can also demonstrate technical judgment, the ability to name tradeoffs clearly, and the discipline to separate "good enough for now" from "clean enough to grow."

## The Architecture I Want to End Up With

The end state I am aiming for looks like this:

- API nodes handle external contracts and streaming delivery
- Java workers handle workflows, persistence, report synthesis, and `jsoup`
- Node workers handle Crawlee and browser execution
- Temporal coordinates the durable lifecycle across all of them

At that point, the system is not just "using Temporal."

It is organized around Temporal in a way that makes worker boundaries, retries, and scaling behavior much more coherent.

That is the version of the architecture I think is worth writing about.
