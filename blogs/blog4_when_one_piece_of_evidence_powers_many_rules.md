# When Building a Rule Engine, Your First Instinct Is Usually Wrong

When I say "rule engine" here, I do not mean anything grand or enterprise-looking.

I mean a piece of software that takes some input, inspects it, and produces many small judgments.

In one project I was building a web page auditing worker. It would fetch a page and answer questions like:

- this page has no title
- the title is too short
- the page blocks indexing
- the page has no clear canonical
- the main content is too thin

That is a rule engine in plain language: look at evidence, produce judgments.

But the same structure shows up in many other systems too:

- fraud systems reviewing a login or payment
- compliance systems reviewing a transaction
- linters reviewing source code
- alerting systems reviewing metrics and logs
- moderation systems reviewing content or behavior

In all of those systems, you are doing the same basic thing:

1. collect evidence
2. apply rules
3. produce findings

Our problem sounded simple enough at first.

We were collecting a few page signals and turning them into findings. Things like:

- title
- meta description
- canonical URL
- robots directives
- heading count
- body content

The first version of the problem looked like this:

- read the page
- inspect a few fields
- turn them into pass/fail checks

Once you are in that mindset, the most natural developer instinct is to jump straight to rule-shaped helpers like this:

- `isTitlePresent`
- `isTitleGreaterThan20`
- `hasMetaDescription`
- `hasCanonical`
- `hasSingleH1`

That instinct is understandable, and for a while it even feels correct.

In fact, it is often the fastest way to get the first version working.

Each rule looks isolated.
Each function sounds clear.
Each new requirement feels like "just add one more check."

At first, this looks modular.

But after enough rules, you realize something important:

you did not actually modularize around the thing the system is reasoning about.

You modularized around the first few judgments.

That works for a while.
Then it starts becoming the thing that slows you down.

This showed up while I was designing a page auditing system, but the lesson is much broader than SEO.

The same pattern appears in:

- fraud and risk engines
- compliance and policy systems
- linters and static analyzers
- trust and safety moderation systems
- alerting and observability rules
- document validation pipelines

Anywhere one observed thing can power multiple judgments, this design problem appears.

## Why Our First Approach Made Sense

Suppose you are checking web pages.

You start with a few obvious rules:

- does the page have a title?
- is the title long enough?
- does the page have a meta description?
- does the page have one H1?

So you naturally reach for rule-shaped code:

```js
isTitlePresent(page)
isTitleGreaterThan20(page)
hasMetaDescription(page)
hasSingleH1(page)
```

That feels right for three reasons.

### 1. It maps directly to requirements

If a requirement says "make sure the page has a title," then `isTitlePresent` feels like a perfect match.

The code looks like the rule.

That is satisfying.

### 2. It is fast to implement

You do not need a deeper model.

You just write the checks, get results, and move on.

That is often exactly what you should do in an early vertical slice.

### 3. It creates the appearance of modularity

Each rule is in its own function.
Each function has one job.
Each failure can become one finding.

Nothing looks tangled yet.

And that is the trap.

The code is modular by file or function, but not necessarily modular by reasoning.

That distinction is the whole story.

Our first approach was modular in the short-term sense:

- one helper per rule
- one new boolean per new requirement
- one obvious pass/fail output per check

That is a perfectly reasonable first slice.

The problem is that it scales around the wording of the current rules, not around the underlying evidence the system keeps reusing.

## What Actually Starts Going Wrong

The first 5 or 10 rules often feel fine.

Then you add more.

That is when the pattern starts revealing itself.

You notice that `title` is no longer just for one rule.

Now it matters for:

- presence
- minimum length
- maximum length
- uniqueness
- alignment with H1
- match with intent
- duplication across pages

The same thing happens in other systems.

In a fraud engine, one device fingerprint might support:

- suspicious login rule
- account sharing rule
- impossible travel rule
- payment risk rule

In a linter, one AST node might support:

- formatting rule
- naming rule
- dead code rule
- correctness rule

In a compliance engine, one transaction might support:

- sanctions screening
- threshold reporting
- suspicious pattern detection
- country-specific obligations

This is the real shift:

one piece of evidence starts powering many rules.

At that point, your original rule-shaped helpers start showing their limits.

That was the moment our first approach started backfiring.

Not because it was broken, but because each new rule kept circling back to the same shared evidence. The architecture was encouraging us to create more tiny judgment helpers when what we really needed was a cleaner model for shared inputs.

## The Hidden Problem With `isTitlePresent`

The issue with `isTitlePresent` is not that it is wrong.

The issue is that it hides the more reusable thing behind a single judgment.

The reusable thing is not the boolean.

The reusable thing is the title itself.

Once you name your system around rule outcomes instead of shared evidence, you accidentally push the architecture toward narrow helpers like:

- `isTitlePresent`
- `isTitleGreaterThan20`
- `isTitleLessThan60`
- `doesTitleMatchH1`
- `isTitleUnique`

Those all sound separate, but they are all orbiting the same underlying evidence.

So what happens?

- logic starts getting repeated conceptually
- naming gets crowded
- adding new rules feels local, but understanding the system gets harder
- the system grows by multiplying judgments rather than stabilizing shared inputs

That is why these systems often feel okay at rule 4 and annoying at rule 14.

## Why This Still Wasn't a "Mistake"

I want to be fair to the early approach, because a lot of architecture writing becomes fake hindsight.

The early rule-shaped model is often reasonable.

If you only have a handful of checks, then direct checks are a good way to prove that:

- the pipeline works
- the report shape works
- the system is actually useful

You do not need a mini framework on day one.

You do not need a grand evidence/facts/rules taxonomy before the problem exists.

The real lesson is not:

"never write `isTitlePresent`."

The real lesson is:

"notice when your rule names are multiplying around the same evidence, and redesign around that evidence before the system hardens in the wrong shape."

That is a very different claim.

## The Pattern You Start Seeing After the First 10 Rules

There is usually a moment where the architecture starts telling you the truth.

It sounds like this:

- "why do we have so many title-related helpers?"
- "why does this same page field affect three different sections of the report?"
- "why does adding one rule require updating collectors, scoring, and grouping?"
- "why does one signal keep appearing in multiple conceptual buckets?"

This is the moment where many developers start feeling vague discomfort but cannot yet name the problem.

The problem is not that the system has too many rules.

The problem is that the system is organized around judgments that are too small and too specific.

The durable thing is usually not the judgment.

The durable thing is the evidence.

## A Better Way to Think About It

Once you see the pattern, the architecture becomes much easier to reason about.

Separate these four ideas:

### 1. Evidence

What did we observe?

Examples:

- page title
- robots meta content
- canonical URL
- body text
- device fingerprint
- transaction country
- AST node
- log latency

This is raw or near-raw input.

### 2. Facts

What seems to be true based on that evidence?

Examples:

- title exists
- title length is 42
- indexing is blocked
- body text is thin
- device is shared across many accounts
- transaction exceeds threshold
- function is unused
- latency is above baseline

Facts are reusable interpretations.

### 3. Rules

What judgment do we want to make?

Examples:

- require a title
- warn if the title is too short
- fail if indexing is blocked
- flag suspicious account sharing
- report an unused function
- fire a latency alert

Rules consume facts.

### 4. Reporting or Packs

Where should the finding appear?

Examples:

- crawlability
- content visibility
- fraud risk
- compliance
- code quality
- reliability

This is presentation and grouping, not evidence ownership.

That separation matters a lot.

This was the fix that made the system feel sane again.

Instead of treating each rule-shaped boolean as the main building block, we started treating the evidence itself as the stable part of the design.

So instead of centering the model on helpers like:

- `isTitlePresent`
- `isTitleGreaterThan20`
- `isTitleLessThan60`

the better center became:

- `title`
- `titleLength`
- related derived facts

Then many rules could reuse the same evidence cleanly.

Why does that fix make sense?

Because titles, transactions, device fingerprints, AST nodes, and latency measurements tend to stay meaningful as systems grow. Tiny one-purpose booleans often do not. They multiply too fast and hide the common source they depend on.

## The Shift From Rule-Shaped Code to Evidence-Shaped Code

The biggest change is simple:

instead of starting from `isTitlePresent`, start from `title`.

Instead of starting from `isTransactionOver10000`, start from `transactionAmount`.

Instead of starting from `isUnusedFunction`, start from the underlying symbol references.

Instead of starting from `isDeviceShared`, start from the device identifier and its account graph.

This does not mean you stop writing rules.

It means you stop pretending that the rule result is the most reusable unit in the system.

The more reusable unit is usually the evidence and the facts derived from it.

That is what lets one observation support many future rules without twisting the architecture.

## How Other Developers Can Tell When to Refactor

You do not need to predict the final system up front.

But you should watch for these signals:

### 1. Many helpers are orbiting the same field

If you keep adding new checks around `title`, `deviceId`, `country`, `amount`, `AST node`, or `latency`, that field probably deserves to become a first-class evidence object.

### 2. New rules no longer feel local

If adding one rule means touching multiple layers awkwardly, the current modularity may be too shallow.

### 3. The same evidence affects multiple report sections

That usually means your categories are presentation concerns, not architecture boundaries.

### 4. You keep writing booleans where richer data would age better

`isXPresent` is often okay early on.

But if you keep deriving more and more booleans from the same source, it is usually a sign you should store `X` and derive facts from it instead.

### 5. The code is modular by folder, but confusing in terms of dependency

This is a subtle but important one.

You can have beautifully separated files and still have the wrong system shape.

If people struggle to answer "what is this rule actually based on?" then the architecture is probably too judgment-first.

## A Simple Heuristic

Here is the heuristic I would use now when approaching these systems:

If your first instinct is to create helpers like:

- `isTitlePresent`
- `isTitleGreaterThan20`
- `isTitleLessThan60`

pause and ask:

"Should the modular boundary actually be `title`?"

Then ask the same question in other domains:

- should the boundary be `device fingerprint` instead of `isSharedDevice`?
- should the boundary be `transaction amount` instead of `isLargeTransaction`?
- should the boundary be `symbol usage graph` instead of `isUnusedFunction`?
- should the boundary be `latency distribution` instead of `isSlowEndpoint`?

That question does not always force a refactor immediately.

But it helps you notice whether your architecture is growing around reusable evidence or around brittle judgment-shaped helpers.

## The Practical Lesson

The lesson is not that your first instinct is stupid.

It is that your first instinct optimizes for shipping the first few rules, not for living with the next twenty.

That is normal.

Early modularity often means:

- one function per rule
- one file per category
- one boolean per requirement

Longer-term modularity often means:

- one evidence object can support many facts
- one fact can support many rules
- one finding can matter to multiple report sections without being duplicated

That is the shift.

When you are small, rule-shaped code can be the right shape.

When the pattern emerges that one piece of evidence powers many rules, the more durable design is to decouple the evidence from the judgments.

That is when the system stops being just a list of checks and starts becoming a rule engine you can actually grow.
