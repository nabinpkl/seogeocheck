# Vibe Coding Trap: Your LLM Did Not Write A DTO. It Dumped Your Guts.

Vibe coders hit this problem faster than traditional teams because the feedback loop is so short.

You ask:

"Make me an audit endpoint."

The model gives you:

- a controller
- a service
- a response object
- maybe some tests

It looks productive.

But if you are not careful, the "response object" is not actually a client DTO.

It is just your internal object graph wearing JSON lipstick.

That distinction matters a lot more than people think.

## The Silent Failure Mode

LLMs are very good at making something that compiles.

They are much less reliable at preserving architectural boundaries unless you force them to.

So what usually happens?

You already have some rich internal model like:

- scoring internals
- diagnostics
- raw evidence
- control state
- retry metadata
- signing metadata
- internal status details

Then you ask the model to "return the report."

The model does the obvious thing:

it returns the report.

Not the client-safe version of the report.

Not the intentionally curated projection.

Not the stable external contract.

Just... the report.

That is why teams accidentally expose things like:

- internal reasoning trees
- probe metadata
- duplicate representations of the same fact
- debug-only fields
- operational failure details that confuse end users
- fields that make refactors harder because clients quietly depend on them

The leak is usually not malicious.

It is structural.

The model is pattern matching on the nearest object that seems useful.

If your codebase does not make the boundary painfully obvious, the model will happily cross it.

## Why This Happens So Often With LLMs

Because the model optimizes for local completion, not system discipline.

If the prompt says:

"Expose the audit result"

the shortest path is:

- find audit result object
- serialize it
- done

That is not intelligence.

That is autocomplete with ambition.

And honestly, humans do the same thing under deadline pressure.

The difference is that vibe coding makes this failure mode scale faster.

You can generate five endpoints in an afternoon.

You can also generate five accidental contract leaks in an afternoon.

## "But The Extra Fields Are Useful"

Yes.

They are useful for:

- internal debugging
- developer tooling
- QA investigations
- support workflows
- replay analysis

That still does not mean they belong in the default client response.

This is the core best practice:

**An internal model exists to help your system think. A client DTO exists to help another system depend on you safely.**

Those are not the same job.

When you return your internal object directly, you create at least four problems.

## Problem 1: You Leak Internal Details By Accident

This is the most obvious one.

Sometimes the leak is security-sensitive.

More often it is architectural leakage:

- implementation-specific statuses
- internal pipeline steps
- raw fetch or retry diagnostics
- low-level evidence blobs
- duplicate fields whose meaning is only clear if you know the internals

Even when nothing "sensitive" leaks, clients still learn too much about your internals.

That is a long-term liability.

## Problem 2: You Teach Clients To Depend On The Wrong Things

Clients are opportunistic.

If you expose ten fields, someone will use all ten.

Maybe your UI only needed:

- score
- verdict
- findings
- top actions

But the raw payload also included:

- intermediate controls
- probe diagnostics
- fallback metadata
- internal scoring weights

Now a frontend engineer, an MCP client, or some third-party integration starts depending on those details because they are available.

Congratulations.

Your internal representation is now public API.

## Problem 3: Your Response Becomes Hard To Understand

This is the usability problem people underestimate.

A bloated payload is not just ugly.

It is ambiguous.

The client cannot tell:

- which field is canonical
- which field is derived
- which field is debug-only
- which field is stable
- which field is safe to show to users

If one concept appears in three places, your contract is already lying.

The API consumer should not need archaeology skills.

## Problem 4: Refactoring Gets More Expensive

This is where the pain shows up six months later.

You want to improve internals.

Maybe you rename a control.
Maybe you change how scoring works.
Maybe you split one diagnostic block into two better ones.

If those internal structures were leaked directly, the refactor is no longer internal.

Now it is a breaking API change.

That is how teams accidentally freeze their architecture.

Not because they designed a public contract.

Because they forgot to.

## What Best Practice Actually Looks Like

The fix is boring.

That is why it works.

### Step 1: Name The Boundary Explicitly

Do not let "response" mean whatever object was nearby.

Have a clearly named client-facing DTO such as:

- `AuditSummaryDto`
- `AuditFindingDto`
- `AuditReportResponse`
- `McpAuditResultDto`

The name should make the intent obvious.

If the model sees `InternalAuditReport` and `AuditReportResponse`, you have already improved the odds.

### Step 2: Make The Mapping A Real Step

Do not "kind of" map it.

Do not spread the internal object and remove two fields.

Do not serialize the domain model and pray.

Write an explicit projection step:

- internal model in
- client DTO out

That mapping is not busywork.

That mapping is the security gate, the semantics gate, and the maintainability gate.

### Step 3: Decide What The Client Actually Needs

This is where a lot of vibe-coded systems get lazy.

A client DTO should answer:

- what happened
- what matters
- what the user should do next

Not:

- every internal fact the pipeline observed
- every fallback path the worker attempted
- every implementation detail that happened to exist

If a field does not directly help a client render, decide, or link to the next action, it probably does not belong in the default DTO.

### Step 4: Split Debug Output From Product Output

This is the move that keeps both sides happy.

You usually do not need less information.

You need better information boundaries.

For example:

- default client DTO for normal consumers
- debug DTO or internal endpoint for operators
- signed report optimized for storage and verification
- MCP-safe response optimized for agents

One giant payload trying to serve all audiences is how contracts rot.

### Step 5: Treat DTOs As Deliberate Public Contracts

Once a field is exposed, assume somebody will depend on it.

That means:

- stable naming
- stable semantics
- clear nullability rules
- clear ownership of derived fields
- intentional versioning when needed

If you are not willing to support a field, do not expose it.

## Why This Is Harder Than It Sounds

This is the part people do not like hearing.

Cleaning this up later is annoying.

Sometimes very annoying.

Because once the system is already returning the internal blob, untangling it means:

- identifying what clients actually use
- separating user-facing data from diagnostics
- renaming misleading fields
- removing duplicates
- rewriting tests
- updating frontend assumptions
- maybe breaking existing integrations

That is real work.

This is why teams postpone it.

And this is also why they should not.

Because the longer you wait, the more consumers you train against a bad contract.

So yes, maintaining client-facing DTOs can feel like a necessary evil.

But "necessary evil" is still the wrong phrase.

It is actually one of the cheapest forms of architectural insurance you can buy.

## How I Would Tell A Vibe Coder To Work

If you are using LLMs heavily, give the model stricter instructions than you think you need.

Do not say:

"Return the audit report."

Say:

"Return a client-facing DTO. Do not expose internal diagnostics, control state, signing metadata, raw pipeline evidence, or implementation-specific fields. Map only the fields needed for UI rendering and agent consumption."

Even better:

- define the DTO first
- define the JSON schema first
- define example payloads first
- then ask the model to implement the mapper

That order matters.

If you let the model invent the contract from the domain object, you are delegating architecture to inertia.

## The Real Principle

Here is the shortest version:

**Internal models are for change. DTOs are for promises.**

If you mix them, you make change harder and promises sloppier.

That is the entire problem.

And yes, an LLM will absolutely fail this boundary if you are not careful.

Not because the model is stupid.

Because you asked a speed tool to make a judgment call that should have been an architectural decision.

That part is still your job.
