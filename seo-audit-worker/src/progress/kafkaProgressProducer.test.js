import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuditProgressProducerConfig,
  publishProgressEvent,
} from "./kafkaProgressProducer.js";

test("createAuditProgressProducerConfig puts acks on kafkaJS producer config", () => {
  const config = createAuditProgressProducerConfig("kafka:9092");

  assert.equal(config["bootstrap.servers"], "kafka:9092");
  assert.equal(config["enable.idempotence"], true);
  assert.deepEqual(config.kafkaJS, { acks: -1 });
});

test("publishProgressEvent sends keyed JSON messages without send-level acks", async () => {
  let payload = null;
  const producer = {
    async send(input) {
      payload = input;
    },
  };

  await publishProgressEvent(
    producer,
    {
      schemaVersion: 1,
      jobId: "audit_123",
      eventId: "audit_123:stage:source_capture_complete",
      producer: "seo-audit-worker",
      eventType: "status",
      status: "STREAMING",
      emittedAt: "2026-03-24T12:00:00.000Z",
      message: "Captured source HTML",
      stage: "source_capture_complete",
      progress: 25,
    },
    "seogeo.audit.progress.v1"
  );

  assert.deepEqual(payload, {
    topic: "seogeo.audit.progress.v1",
    messages: [
      {
        key: "audit_123",
        value: JSON.stringify({
          schemaVersion: 1,
          jobId: "audit_123",
          eventId: "audit_123:stage:source_capture_complete",
          producer: "seo-audit-worker",
          eventType: "status",
          status: "STREAMING",
          emittedAt: "2026-03-24T12:00:00.000Z",
          message: "Captured source HTML",
          stage: "source_capture_complete",
          progress: 25,
        }),
      },
    ],
  });
  assert.equal("acks" in payload, false);
});
