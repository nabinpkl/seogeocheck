# Your Worker Is Busy. Great. How Does The User Find Out?

This sounds like a UI problem.

It is not.

It is an architecture problem wearing a UI hat.

The first version of the question sounds harmless:

"How do I stream progress updates to the user while my worker is running?"

Then the second question arrives:

"Wait. Are those updates real work?"

Then the third:

"If they are not real work, why am I modeling them like work?"

That is the whole trap.

In SEOGEO, I ran into exactly this problem while thinking through audit streaming.

The worker does real work:

- fetch source HTML
- inspect crawl and indexability signals
- load a rendered page
- evaluate SEO rules
- build a final result

But the user also needs to see momentum:

- collecting source HTML signals
- checking crawlability prerequisites
- evaluating metadata checks
- preparing final report

Those progress updates matter.

But they are not the audit itself.

They are not durable business outputs in the same sense as the final report.

They are operational truth exposed to the UI.

And once you see that clearly, the design questions get much easier.

## The Core Mistake: Treating Progress Like Business Work

A lot of systems fall into one of two extremes.

### Extreme 1: Fake it at the end

The worker finishes.

Then the backend replays final findings one by one to make the UI feel alive.

This looks nice.

It is also fake.

The user is not seeing work as it happens.

They are seeing a dramatized replay.

That is not progress streaming.

That is theater.

### Extreme 2: Turn every update into a separate distributed task

Now the overcorrection begins.

You start thinking:

- one activity for collecting source HTML
- one activity for deriving facts
- one activity for each rule
- one activity for report preparation

This feels more truthful at first.

But if those steps only exist so you can emit logs, you are no longer modeling actual work boundaries.

You are modeling observability boundaries as if they were work boundaries.

That creates another kind of lie.

A more expensive one.

## So What Is Progress, Really?

Progress is not usually a first-class business action.

It is usually one of these:

- state attached to a long-running job
- operational metadata emitted while real work is happening
- a user-facing projection of internal execution milestones

That distinction matters.

Because the architecture should respect it.

If the real work is "run an audit," then the progress model should usually be:

- the audit runs
- the worker reports what stage it has reached
- the backend records those updates
- the frontend streams them

Not:

- the audit runs
- every progress message becomes a new unit of orchestration

That is a very different philosophy.

## What Industry Usually Does

If you strip away product-specific naming, most systems use one of these patterns.

### Pattern 1: Status Resource

This is the classic long-running operation model.

The client starts a job and gets back an id.

Then the system keeps a status record somewhere:

- queued
- running
- 40% complete
- validating inputs
- finished

The client either:

- polls the status resource
- or subscribes to a stream fed by that status resource

This is boring.

That is why it survives.

### Pattern 2: Worker Progress Reporting

Here the worker emits progress while the main job is still running.

Not stdout spam.

Structured events.

Things like:

- stage: `source_capture_complete`
- stage: `render_capture_unavailable`
- rule: `meta-description`
- rule: `document-title`

The key idea is simple:

the worker does not return progress only at the end.

It reports progress through a side channel while the main job continues.

That is the model most people actually want when they say "stream logs to the user."

### Pattern 3: Event Bus / Broker

At larger scale, workers publish progress to Kafka, SNS, Pub/Sub, EventBridge, or something similar.

Then other services consume that stream and project it into:

- user-facing status
- analytics
- alerting
- internal dashboards

This is real.

This is standard.

This is also usually too much for a focused product slice.

Especially when one backend already owns the user-facing stream.

## The Real Question Is Not "How Do I Stream?"

The real question is:

"Where should progress live?"

That answer determines almost everything.

## Option 1: The Worker Writes Directly To The Browser

Almost never the right answer.

Why?

Because the worker should not own:

- browser connection lifecycle
- reconnect behavior
- replay
- authorization
- canonical event history

If the user refreshes, reconnects, or opens a second tab, you now need the worker to somehow remember what was already sent.

That is the backend's job.

Not the worker's.

## Option 2: The Worker Writes Progress Directly To The Database

This can work.

It is not crazy.

But it changes ownership.

Now the worker is no longer just computing results.

It also owns part of:

- event persistence semantics
- event ordering
- deduplication behavior
- user-facing stream shape

Sometimes that tradeoff is worth it.

Often it is not.

If you already have a backend that owns the event log and SSE stream, letting the worker write directly to the same tables can blur the architecture more than it helps.

## Option 3: The Worker Reports Progress To The Backend

This is the one I keep coming back to.

And it is not hacky.

It is very normal.

The worker says:

- "I finished source capture."
- "Rendered capture failed, continuing with source findings."
- "Rule meta-description evaluated."

The backend receives that.

Then the backend:

- validates it
- persists it
- streams it over SSE

That is a clean separation.

The worker executes.

The backend owns user-visible momentum.

The final report still gets built and signed separately.

That is important.

Because live progress and durable truth are not the same thing.

## "Isn't That Just A Callback?"

Yes.

And that is fine.

In practice, this pattern goes by several names:

- progress callback
- internal webhook
- event sink
- status ingest endpoint
- progress reporter

Different words.

Same idea.

A running worker sends structured progress events to a backend-controlled ingress.

That backend then turns them into durable event history and user-facing stream updates.

There is nothing embarrassing about that pattern.

It is a standard response to a very standard problem.

## But Wait. If Progress Is Not Real Work, Should It Be In Temporal At All?

Usually not as separate work units.

That was one of the biggest clarifications for me.

A progress update like:

- "Collected source HTML signals"

is not the same kind of thing as:

- "Fetch source HTML"

The second is real work.

The first is a report about work.

If you model both as equivalent distributed tasks, you start paying orchestration costs for observability messages.

That is a smell.

So if the worker is already doing one long-running activity, a more honest model is:

- the activity keeps running
- the worker emits progress updates through a side channel
- the main result still returns at the end

That keeps the workflow model about work.

And the progress model about progress.

## What Should The Worker Actually Send?

Not raw logs.

That sounds tempting.

But raw logs are a terrible product contract.

They are noisy.

They change constantly.

They leak implementation details.

They are hard to deduplicate.

And once the UI starts depending on them, you have accidentally turned logging into an API.

Instead, the worker should send structured events.

For example:

- event type
- job id
- stage or rule id
- user-facing message
- progress number if useful
- dedupe key
- timestamp

And for rule results:

- status
- severity
- instruction
- detail
- selector
- metric

Now the backend is dealing with events.

Not console output.

That is a huge difference.

## What About Security?

If the worker is calling back into the backend, one obvious concern shows up immediately:

"How do I know some random user is not posting fake progress events?"

That concern is valid.

The answer is the same answer used for many internal callbacks and webhooks:

- signed requests
- internal secret
- replay protection
- job binding
- idempotency keys

In plain language:

- the worker signs the payload
- the backend verifies the signature
- the backend only accepts events for known in-flight jobs
- duplicate event ids are ignored

That is enough for a strong internal progress channel.

No need to pretend the route is safe just because it is "internal."

## So What Would I Choose?

For a system like SEOGEO, the cleanest model is:

1. the frontend starts an audit and gets a durable `jobId`
2. the backend starts the worker through Temporal
3. the worker runs the audit in one coarse unit of work
4. during execution, the worker emits structured progress events through a callback-style ingress
5. the backend appends those events to the audit event log
6. SSE streams that event log to the client
7. when the audit is done, the backend persists the final signed report
8. the backend emits `complete`

That gives you:

- truthful progress
- durable replay
- clear ownership
- a clean final report boundary

And just as importantly, it avoids two common mistakes:

- fake live playback after the worker already finished
- over-modeling progress messages as distributed work

## The Short Version

If your worker needs to tell the user what it is doing, do not start by asking:

"How do I stream logs?"

Ask:

"What is the real work?"

Then ask:

"What is merely progress about that work?"

That one distinction will usually tell you where the events should live.

Real work belongs in your execution model.

Progress belongs in your progress-reporting model.

Mix them too aggressively and the architecture gets weird fast.

Keep them separate and the system starts making sense again.
