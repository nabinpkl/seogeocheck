# An Event Happened. Cool. Why Are You Reaching For Kafka?

How to emit logs to the client/user where workers does the heavy task we only need a architecture to emit light notifications type events to the user / progress event.

There is a very modern architectural reflex that goes like this:

- I have events
- Kafka is for events
- therefore I need Kafka

That logic is clean.

It is also incomplete.

Because "an event happened" is not the interesting threshold.

Events happen everywhere.

- a user signed in
- a page audit started
- a worker finished source capture
- a payment failed
- a report was generated

If "an event exists" were enough, every backend would need Kafka on day one.

Most do not.

So the better question is not:

"Do I have events?"

The better question is:

"What pressure is my system under that request-response or direct callbacks no longer express cleanly?"

That is where Kafka starts making sense.

## The Wrong Reason To Adopt Kafka

Let me start with the bad reason.

The bad reason is architecture aesthetics.

It sounds like this:

- events feel modern
- pub/sub feels scalable
- callbacks feel dirty
- Kafka feels serious

This is how a lot of teams quietly talk themselves into infrastructure they do not yet need.

Not because the tech is bad.

Because the decision was shallow.

Kafka is not valuable because the word "event" appears in your system.

Kafka is valuable when the shape of your communication problem starts looking more like a stream than a conversation.

That is the distinction that matters.

## So When Does Kafka Actually Start Making Sense?

Usually when several of these pressures show up at once.

Not one.

Several.

## 1. When One Producer Should Not Need To Know Its Consumers

This is one of the clearest signals.

With a callback model, the producer knows where to send the update.

That means:

- the worker knows the backend endpoint
- the backend authenticates the worker
- the producer and consumer are directly coupled

That is fine when the relationship is simple.

But what happens when one producer now needs to feed:

- the user-facing progress stream
- analytics
- alerting
- internal debugging
- audit replay

Now the producer either:

- sends many callbacks
- or sends one callback to a service that fans out everything

At that point, a bus starts looking more honest.

Because the real problem is no longer "tell that service something."

The real problem is "publish a fact that many consumers may care about."

That is a Kafka-shaped problem.

## 2. When Replay Is A Feature, Not An Accident

This one matters a lot.

Callbacks are about delivery.

Kafka is about a log.

That sounds subtle.

It is not.

If you need to say:

- "consume this later"
- "rebuild the projection"
- "attach a new consumer after the fact"
- "replay yesterday's events into a new pipeline"

then you are no longer dealing with mere notification.

You are dealing with event history as a useful asset.

That is where Kafka gets interesting.

Because replay is not some optional convenience there.

It is part of the mental model.

## 3. When Multiple Consumers Are Not A Hypothetical Future

A lot of systems say:

"We might have more consumers later."

That sentence alone is not enough.

You can justify anything with "later."

Kafka starts making more sense when multiple consumers are not fantasy architecture anymore.

For example:

- one consumer projects audit progress into Postgres for SSE
- another consumer feeds internal metrics
- another consumer stores raw progress events for debugging
- another consumer triggers notifications on terminal states

Now you do not have one communication path.

You have a stream with several readers.

That is materially different.

## 4. When Callback Auth Starts Turning Into Relationship Management

This is less glamorous, but very real.

Point-to-point callbacks seem simple until there are many pairs of services.

Then you start accumulating:

- callback endpoints
- shared secrets
- signature verification logic
- retry semantics
- idempotency logic
- consumer-specific contracts

At small scale this is manageable.

At larger scale, it starts feeling like you built a private integration platform by accident.

Kafka is attractive here because it changes the shape of the problem.

Instead of:

- service A authenticates to service B
- and then service A authenticates to service C
- and then service A maybe talks to service D too

you get:

- service A publishes to the bus
- authorized consumers subscribe

That is not free.

But it is cleaner once the graph gets wide enough.

## 5. When You Care About Decoupling Operationally, Not Just Conceptually

Some teams say they want decoupling.

What they really mean is they want nicer diagrams.

That is not the same thing.

Real decoupling means things like:

- consumers can be down without blocking producers
- consumers can scale independently
- new consumers can appear without changing producers
- throughput spikes can be absorbed by the stream

If you do not need any of that, you may not need Kafka.

If you do, then Kafka starts becoming more than an architectural flex.

It becomes load-bearing.

## 6. When Your Events Are Becoming A Platform Primitive

This is maybe the strongest reason of all.

Sometimes events are just implementation detail.

Sometimes they are becoming the spine of the system.

That happens when other capabilities start depending on them:

- stream processing
- projections
- auditing
- observability
- derived state
- downstream automation

At that point, the event stream is not just "how we notify something."

It is part of the product's internal platform.

Kafka fits much better there than ad hoc callbacks.

## When Kafka Does Not Make Sense

This is the part people skip.

Kafka is not a reward for having architecture ambition.

It is a tool with costs.

So here are the anti-signals.

## 1. One Producer, One Consumer, Clear Ownership

If a Node worker only needs to report progress to one Java backend, and that backend already owns:

- persistence
- SSE
- report lifecycle
- user-visible stream semantics

then a callback can be completely reasonable.

That is not a failure.

That is a focused design.

## 2. No Real Replay Need Beyond The Existing Database

If you already store the projected events you need in Postgres, and nobody needs the raw event stream for anything else, Kafka may just be an extra hop.

Not every system needs a durable event backbone and a durable relational projection and a workflow history and a report store all at once.

Sometimes one durable projection is enough.

## 3. No Meaningful Fan-Out

If there is no actual second consumer, Kafka can be a very expensive way to avoid a simple internal callback.

Possible future consumers do not count nearly as much as real present ones.

## 4. The Team Is Mostly Chasing The Vibe

This one deserves to be said plainly.

If the main argument is:

- "it feels more senior"
- "it looks better in diagrams"
- "events should go to Kafka because that is what big systems do"

then the design is probably still immature.

Big systems do not use Kafka because events are cool.

They use Kafka because the communication topology actually demands a bus.

## So What About Progress Updates From Workers?

This is where the nuance matters.

A worker progress stream can be modeled in at least three legitimate ways.

### Model A: Callback To Backend

The worker sends structured progress events to the backend.

The backend:

- validates them
- persists them
- streams them to the UI

This is often the right answer when ownership is clear and the audience is basically one product backend.

### Model B: Worker Writes To Shared Event Store

The worker writes structured events directly to a shared durable log or table.

The backend then reads and streams them.

This can work.

But it pulls the worker deeper into persistence semantics.

### Model C: Worker Publishes To Kafka

The worker publishes progress events.

Then:

- one consumer projects them for SSE
- another consumer tracks metrics
- another stores raw events
- another watches for audit terminal states

Now Kafka is not there because "progress exists."

Kafka is there because the progress stream has become multi-consumer infrastructure.

That is a real reason.

## The Useful Rule Of Thumb

If your communication still feels like:

"Please tell that service this happened."

you are probably still in callback territory.

If it feels like:

"This happened, and the system should be free to react in several ways."

you are moving into bus territory.

That is a better decision rule than:

"Was the word event involved?"

## The SEOGEO Angle

For a product like SEOGEO, this is exactly why Kafka can look unnecessary in one conversation and quite reasonable in another.

If the question is:

"What is the simplest truthful way for the Node worker to report progress to the UI?"

then a backend callback is perfectly respectable.

If the question becomes:

"What is the most coherent event-driven architecture for worker progress, future analytics, replay, projections, and multiple consumers in a deliberately overengineered portfolio system?"

then Kafka starts looking much stronger.

Not because it is trendy.

Because the communication pattern has changed.

That is the key insight.

Kafka is not justified by the existence of events.

Kafka is justified by the shape of the relationships around those events.

## The Short Version

Do not ask:

"Did an event happen?"

Ask:

- how many consumers exist now?
- how many will likely exist soon?
- do producers need to stay ignorant of consumers?
- is replay valuable?
- is the stream becoming infrastructure?
- are callbacks turning into relationship management?

If the answers stay small, callbacks may be exactly right.

If the answers start getting large, Kafka stops looking like hype and starts looking like architecture.
