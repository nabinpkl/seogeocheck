import test from "node:test";
import assert from "node:assert/strict";
import {
  createCheckEvent,
  createStageEvent,
  createWorkerErrorEvent,
} from "./auditProgressEvents.js";

test("createStageEvent uses deterministic stage ids and progress", () => {
  const event = createStageEvent("audit_123", "source_capture_complete", "Collected source HTML signals.");

  assert.equal(event.eventId, "audit_123:stage:source_capture_complete");
  assert.equal(event.eventType, "status");
  assert.equal(event.status, "STREAMING");
  assert.equal(event.progress, 25);
});

test("createCheckEvent maps rule payloads into deterministic Kafka envelopes", () => {
  const event = createCheckEvent("audit_123", {
    id: "meta-description",
    label: "Meta description is missing",
    status: "issue",
    severity: "medium",
    instruction: "Add a meta description.",
    detail: "No meta description was found.",
    selector: 'head > meta[name="description"]',
    metric: "meta-description",
  });

  assert.equal(event.eventId, "audit_123:rule:meta-description");
  assert.equal(event.eventType, "check");
  assert.equal(event.ruleId, "meta-description");
  assert.equal(event.checkStatus, "issue");
  assert.equal(event.message, "Meta description is missing");
});

test("createWorkerErrorEvent emits a deterministic worker error envelope", () => {
  const event = createWorkerErrorEvent("audit_123", new Error("render failed"));

  assert.equal(event.eventId, "audit_123:error:worker");
  assert.equal(event.eventType, "error");
  assert.equal(event.status, "FAILED");
  assert.equal(event.message, "render failed");
});
