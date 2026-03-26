import { createRequire } from "node:module";
import { assertValidWorkerProgressEvent } from "../contracts/schemaValidation.js";

const require = createRequire(import.meta.url);

const KAFKA_BOOTSTRAP_SERVERS = process.env.KAFKA_BOOTSTRAP_SERVERS ?? "";
const KAFKA_PROGRESS_TOPIC = process.env.KAFKA_PROGRESS_TOPIC ?? "seogeo.audit.progress.v1";
const PRODUCER_ACKS_ALL = -1;

let producerPromise = null;
let kafkaConstructor = null;

function getKafkaConstructor() {
  if (!kafkaConstructor) {
    kafkaConstructor = require("@confluentinc/kafka-javascript").KafkaJS.Kafka;
  }

  return kafkaConstructor;
}

export function createAuditProgressProducerConfig(bootstrapServers = KAFKA_BOOTSTRAP_SERVERS) {
  return {
    "bootstrap.servers": bootstrapServers,
    "enable.idempotence": true,
    "message.send.max.retries": 10,
    "retry.backoff.ms": 250,
    "delivery.timeout.ms": 30000,
    kafkaJS: {
      acks: PRODUCER_ACKS_ALL,
    },
  };
}

export async function publishProgressEvent(producer, event, topic = KAFKA_PROGRESS_TOPIC) {
  assertValidWorkerProgressEvent(event);

  await producer.send({
    topic,
    messages: [
      {
        key: event.jobId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function connectProducer() {
  if (!KAFKA_BOOTSTRAP_SERVERS) {
    return null;
  }

  const Kafka = getKafkaConstructor();
  const producer = new Kafka().producer(createAuditProgressProducerConfig());

  await producer.connect();
  return producer;
}

export async function getAuditProgressProducer() {
  if (!producerPromise) {
    producerPromise = connectProducer().catch((error) => {
      producerPromise = null;
      throw error;
    });
  }

  return producerPromise;
}

export async function emitProgressEvent(event) {
  const producer = await getAuditProgressProducer();
  if (!producer) {
    return false;
  }

  await publishProgressEvent(producer, event);

  return true;
}

export async function disconnectAuditProgressProducer() {
  if (!producerPromise) {
    return;
  }

  const producer = await producerPromise;
  if (producer) {
    await producer.disconnect();
  }
  producerPromise = null;
}
