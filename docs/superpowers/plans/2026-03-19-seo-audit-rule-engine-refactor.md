# SEO Audit Rule Engine Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `seo-audit-worker` from a rule-input-shaped pipeline into an evidence-first rule engine that can absorb many more rules without central maintenance hotspots, while preserving the current audit response shape in the first rollout.

**Architecture:** Keep the current crawl -> audit -> normalize flow working, but split the internals into four layers: page signal collection, derived facts, explicit rule registry, and pack-driven scoring/report assembly. The first refactor should keep the current public output fields (`categoryScores`, `checks`, `rawSummary`) stable so the backend/frontend contract does not break while we improve the worker’s internal model.

**Tech Stack:** Node.js ESM, Crawlee, Temporal worker runtime, `node:test`, `node:assert/strict`

---

## Planned File Structure

**Create**

- `seo-audit-worker/src/audit/collectPageSignals.js`
  Responsibility: crawl-result-to-evidence extraction only; no scoring, no rule decisions.
- `seo-audit-worker/src/audit/collectPageSignals.test.js`
  Responsibility: unit tests for evidence extraction helpers and normalization behavior.
- `seo-audit-worker/src/rules/defineRule.js`
  Responsibility: tiny helper to define rules and standardize metadata.
- `seo-audit-worker/src/rules/deriveFacts.js`
  Responsibility: convert raw evidence into reusable facts consumed by rules.
- `seo-audit-worker/src/rules/registry.js`
  Responsibility: explicit pack registry, explicit rule lists, sorting helpers, and pack metadata.
- `seo-audit-worker/src/rules/invariants.test.js`
  Responsibility: guardrails for unique rule ids, valid pack ids, valid priorities, and scoring coverage.

**Modify**

- `seo-audit-worker/src/worker.js`
  Responsibility after refactor: Temporal/Crawlee orchestration only.
- `seo-audit-worker/src/normalize.js`
  Responsibility after refactor: assemble facts, evaluate rules, score packs, and shape final report.
- `seo-audit-worker/src/rules/metadata.js`
  Responsibility after refactor: metadata rules only, exported explicitly as an array.
- `seo-audit-worker/src/rules/content.js`
  Responsibility after refactor: content-quality rules only, exported explicitly as an array.
- `seo-audit-worker/src/rules/crawlability.js`
  Responsibility after refactor: crawlability rules only, exported explicitly as an array.
- `seo-audit-worker/src/rules/index.js`
  Responsibility after refactor: compatibility shim or re-export to new registry entrypoint.
- `seo-audit-worker/src/normalize.test.js`
  Responsibility after refactor: end-to-end regression tests for report shape and scoring.
- `AGENTS.md`
  Responsibility after refactor: document the new evidence -> facts -> rules -> pack pattern as a core worker rule-authoring pattern.
- `README.md`
  Responsibility after refactor: short contributor-facing note on where new SEO rules live and how they are structured.

## Implementation Constraints

- Preserve the current response shape during this refactor.
- Keep the current rule set behavior equivalent unless a bug is being fixed intentionally.
- Do not introduce compatibility layers beyond what the worker itself needs to stay stable during the refactor.
- Add guardrail tests before widening the ruleset.
- Fix the current `storageDir` scoping bug in `src/worker.js` as part of the extraction work.

### Task 1: Add a Safety Net Around Current Behavior

**Files:**
- Modify: `seo-audit-worker/src/normalize.test.js`
- Create: `seo-audit-worker/src/rules/invariants.test.js`
- Modify: `seo-audit-worker/package.json`

- [ ] **Step 1: Write failing regression tests for current report behavior**

```js
test("normalizeSeoAuditResult preserves current score and check ordering", () => {
  const result = normalizeSeoAuditResult({
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "",
    metaDescription: "",
    canonicalUrl: "https://example.com/",
    h1Count: 2,
    lang: "en",
    robotsContent: "index,follow",
    openGraphTitle: "",
    openGraphDescription: "Useful summary",
    wordCount: 120,
    contentType: "text/html; charset=utf-8",
  });

  assert.deepEqual(result.categoryScores, {
    metadata: 33,
    contentQuality: 50,
    crawlability: 100,
  });
});
```

- [ ] **Step 2: Add a failing invariant test for explicit rule ids and category coverage**

```js
test("registered rules have unique ids and known pack ids", () => {
  const ids = SORTED_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const rule of SORTED_RULES) {
    assert.ok(["metadata", "contentQuality", "crawlability"].includes(rule.category));
  }
});
```

- [ ] **Step 3: Run the tests to capture the current baseline**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/normalize.test.js src/rules/invariants.test.js`

Expected: `normalize.test.js` passes, `invariants.test.js` fails until registry work is added.

- [ ] **Step 4: Update the test script if needed to keep targeted file runs ergonomic**

```json
{
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add seo-audit-worker/src/normalize.test.js seo-audit-worker/src/rules/invariants.test.js seo-audit-worker/package.json
git commit -m "test: add seo audit refactor safety net"
```

### Task 2: Extract Evidence Collection Out of the Worker

**Files:**
- Create: `seo-audit-worker/src/audit/collectPageSignals.js`
- Create: `seo-audit-worker/src/audit/collectPageSignals.test.js`
- Modify: `seo-audit-worker/src/worker.js`

- [ ] **Step 1: Write a failing test for page-signal collection helpers**

```js
test("collectPageSignals returns normalized evidence from crawl inputs", () => {
  const result = collectPageSignals({
    requestedUrl: "https://example.com",
    request: { url: "https://example.com", loadedUrl: "https://example.com/" },
    response: { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    $: load(`<html lang="en"><head><title>Hello</title><meta name="description" content="Desc"></head><body><h1>A</h1>Words here</body></html>`),
  });

  assert.equal(result.title, "Hello");
  assert.equal(result.metaDescription, "Desc");
  assert.equal(result.h1Count, 1);
});
```

- [ ] **Step 2: Run the new test to verify the module does not exist yet**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/audit/collectPageSignals.test.js`

Expected: FAIL with module-not-found or exported-function error.

- [ ] **Step 3: Implement `collectPageSignals()` and move evidence helpers out of `worker.js`**

```js
export function collectPageSignals({ requestedUrl, request, response, $ }) {
  return {
    requestedUrl,
    finalUrl: request.loadedUrl ?? request.url,
    statusCode: response?.statusCode ?? null,
    contentType: response?.headers?.["content-type"] ?? null,
    title: $("title").first().text(),
    metaDescription: readNamedMeta($, "description"),
    canonicalUrl: $('link[rel="canonical"]').attr("href") ?? null,
    h1Count: $("h1").length,
    lang: $("html").attr("lang") ?? null,
    robotsContent: readNamedMeta($, "robots"),
    openGraphTitle: readPropertyMeta($, "og:title"),
    openGraphDescription: readPropertyMeta($, "og:description"),
    wordCount: countWords($("body").text()),
  };
}
```

- [ ] **Step 4: Update `worker.js` to call `collectPageSignals()` and fix `storageDir` scope**

```js
const storageDir = join(tmpdir(), `seogeo-audit-${jobId}`);

auditResult = normalizeSeoAuditResult(
  collectPageSignals({ requestedUrl: targetUrl, request, response, $ })
);
```

- [ ] **Step 5: Run targeted tests**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/audit/collectPageSignals.test.js src/normalize.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add seo-audit-worker/src/audit/collectPageSignals.js seo-audit-worker/src/audit/collectPageSignals.test.js seo-audit-worker/src/worker.js
git commit -m "refactor: extract seo audit page signal collection"
```

### Task 3: Introduce an Explicit Rule Registry

**Files:**
- Create: `seo-audit-worker/src/rules/defineRule.js`
- Create: `seo-audit-worker/src/rules/registry.js`
- Modify: `seo-audit-worker/src/rules/metadata.js`
- Modify: `seo-audit-worker/src/rules/content.js`
- Modify: `seo-audit-worker/src/rules/crawlability.js`
- Modify: `seo-audit-worker/src/rules/index.js`
- Modify: `seo-audit-worker/src/rules/invariants.test.js`

- [ ] **Step 1: Write a failing invariant test that rejects non-explicit rule registration**

```js
test("registry exposes explicit pack definitions and rule arrays", () => {
  assert.ok(Array.isArray(PACKS));
  assert.ok(PACKS.every((pack) => Array.isArray(pack.rules)));
});
```

- [ ] **Step 2: Run the invariant test to verify the current `Object.values(...)` registry fails the new expectation**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/rules/invariants.test.js`

Expected: FAIL because `PACKS` and explicit rule arrays do not exist yet.

- [ ] **Step 3: Implement `defineRule()` and explicit pack exports**

```js
export function defineRule(definition) {
  return definition;
}

export const metadataRules = [documentTitle, metaDescription, socialPreview];
export const contentRules = [primaryHeading, contentDepth];
export const crawlabilityRules = [canonicalUrl, htmlLang, robotsIndexing];
```

- [ ] **Step 4: Create `registry.js` with pack metadata and sorted rule helpers**

```js
export const PACKS = [
  { id: "metadata", label: "Metadata", weight: 1, rules: metadataRules },
  { id: "contentQuality", label: "Content Quality", weight: 1, rules: contentRules },
  { id: "crawlability", label: "Crawlability", weight: 1, rules: crawlabilityRules },
];
```

- [ ] **Step 5: Update `src/rules/index.js` to re-export from the explicit registry**

```js
export { PACKS, ALL_RULES, SORTED_RULES } from "./registry.js";
```

- [ ] **Step 6: Run rule tests**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/rules/invariants.test.js src/normalize.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add seo-audit-worker/src/rules/defineRule.js seo-audit-worker/src/rules/registry.js seo-audit-worker/src/rules/index.js seo-audit-worker/src/rules/metadata.js seo-audit-worker/src/rules/content.js seo-audit-worker/src/rules/crawlability.js seo-audit-worker/src/rules/invariants.test.js
git commit -m "refactor: add explicit seo rule registry"
```

### Task 4: Add a Derived Facts Layer and Migrate Existing Rules

**Files:**
- Create: `seo-audit-worker/src/rules/deriveFacts.js`
- Modify: `seo-audit-worker/src/rules/metadata.js`
- Modify: `seo-audit-worker/src/rules/content.js`
- Modify: `seo-audit-worker/src/rules/crawlability.js`
- Modify: `seo-audit-worker/src/normalize.js`
- Modify: `seo-audit-worker/src/normalize.test.js`

- [ ] **Step 1: Write a failing test for derived facts**

```js
test("deriveFacts creates reusable facts from raw page evidence", () => {
  const facts = deriveFacts({
    title: "Hello world",
    metaDescription: "",
    robotsContent: "noindex,follow",
    h1Count: 2,
    wordCount: 42,
  });

  assert.equal(facts.hasTitle, true);
  assert.equal(facts.titleLength, 11);
  assert.equal(facts.blocksIndexing, true);
  assert.equal(facts.hasSingleH1, false);
});
```

- [ ] **Step 2: Run the new facts test to verify the module is missing**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/normalize.test.js`

Expected: FAIL after adding the new test until `deriveFacts.js` exists.

- [ ] **Step 3: Implement `deriveFacts()` from current evidence fields**

```js
export function deriveFacts(input) {
  const title = normalizeText(input.title);
  const robotsContent = normalizeText(input.robotsContent);

  return {
    ...input,
    title,
    hasTitle: Boolean(title),
    titleLength: title ? title.length : 0,
    hasMetaDescription: Boolean(normalizeText(input.metaDescription)),
    hasCanonicalUrl: Boolean(normalizeText(input.canonicalUrl)),
    hasSingleH1: Number.isFinite(input.h1Count) && Math.round(input.h1Count) === 1,
    blocksIndexing: robotsContent ? /\bnoindex\b/i.test(robotsContent) : false,
  };
}
```

- [ ] **Step 4: Update current rules to consume facts instead of raw rule-shaped inputs**

```js
check: (facts) => {
  return facts.hasTitle
    ? passedCheck(...)
    : issueCheck(...);
}
```

- [ ] **Step 5: Update `normalizeSeoAuditResult()` to derive facts once, then pass facts to every rule**

```js
const facts = deriveFacts(input);
const checks = SORTED_RULES.map((rule) => rule.check(facts));
```

- [ ] **Step 6: Run targeted tests**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/normalize.test.js`

Expected: PASS with unchanged result shape and scores.

- [ ] **Step 7: Commit**

```bash
git add seo-audit-worker/src/rules/deriveFacts.js seo-audit-worker/src/rules/metadata.js seo-audit-worker/src/rules/content.js seo-audit-worker/src/rules/crawlability.js seo-audit-worker/src/normalize.js seo-audit-worker/src/normalize.test.js
git commit -m "refactor: derive seo audit facts before rule evaluation"
```

### Task 5: Make Scoring and Grouping Pack-Driven

**Files:**
- Modify: `seo-audit-worker/src/normalize.js`
- Modify: `seo-audit-worker/src/rules/registry.js`
- Modify: `seo-audit-worker/src/rules/invariants.test.js`
- Modify: `seo-audit-worker/src/normalize.test.js`

- [ ] **Step 1: Write a failing test proving every registered pack contributes to scoring**

```js
test("categoryScores are derived from the registered packs", () => {
  const packIds = PACKS.map((pack) => pack.id);
  const result = normalizeSeoAuditResult(sampleInput);
  assert.deepEqual(Object.keys(result.categoryScores), packIds);
});
```

- [ ] **Step 2: Run the tests to verify `normalize.js` still hard-codes categories**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && node --test src/normalize.test.js src/rules/invariants.test.js`

Expected: FAIL until `categoryScores` comes from `PACKS`.

- [ ] **Step 3: Refactor scoring to iterate over `PACKS` rather than hard-coded category names**

```js
const categoryScores = Object.fromEntries(
  PACKS.map((pack) => [
    pack.id,
    averageScore(checks.filter((check) => check.category === pack.id).map(scoreCheck)),
  ])
);
```

- [ ] **Step 4: Keep the sorted checks output stable while removing scoring duplication**

```js
const sortedChecks = sortChecks(checks).map(({ priority, ...check }) => check);
```

- [ ] **Step 5: Run the full worker test suite**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && pnpm test`

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add seo-audit-worker/src/normalize.js seo-audit-worker/src/rules/registry.js seo-audit-worker/src/rules/invariants.test.js seo-audit-worker/src/normalize.test.js
git commit -m "refactor: score seo audit results from pack registry"
```

### Task 6: Document the New Rule-Authoring Pattern

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: Add a short architecture note to `AGENTS.md` for worker rule organization**

```md
- **SEO Worker Rule Pattern:** New SEO checks should follow `collect evidence -> derive facts -> evaluate rules -> score packs`. Shared evidence must be collected once and reused across rules; rule files should not embed collector logic.
```

- [ ] **Step 2: Add a contributor note to `README.md` describing where to add new SEO rules**

```md
SEO audit rule growth follows an evidence-first pattern:
- `src/audit/collectPageSignals.js` for page evidence
- `src/rules/deriveFacts.js` for shared facts
- `src/rules/*.js` for rules
- `src/rules/registry.js` for pack registration
```

- [ ] **Step 3: Run a final verification pass**

Run: `cd /Users/nabinpokhrel/projects/seogeocheck.com/seo-audit-worker && pnpm test`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: document seo audit rule authoring pattern"
```

## Final Verification Checklist

- [ ] `seo-audit-worker/src/worker.js` only orchestrates crawl lifecycle and delegates evidence collection.
- [ ] `normalizeSeoAuditResult()` derives facts once and evaluates rules from a registry.
- [ ] No rule registration depends on `Object.values(...)`.
- [ ] `categoryScores` comes from registry metadata, not hard-coded category names.
- [ ] Tests cover regression behavior, fact derivation, and registry invariants.
- [ ] `AGENTS.md` documents the new worker pattern.

## Execution Notes

- Keep the first rollout contract-stable even though the internal model changes.
- Do not add future packs like `indexability` or `contentVisibility` in the same refactor unless the frontend/backend are being updated together in the same slice.
- After this plan lands, the next slice can introduce new packs cleanly because the pack registry and facts layer will already exist.
