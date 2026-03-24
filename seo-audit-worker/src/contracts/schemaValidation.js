import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

const workerProgressEventSchema = JSON.parse(
  readFileSync(
    new URL("../../../schemas/audit/audit-worker-progress-event.schema.json", import.meta.url),
    "utf8"
  )
);

const validateWorkerProgressEvent = ajv.compile(workerProgressEventSchema);

export function assertValidWorkerProgressEvent(event) {
  if (validateWorkerProgressEvent(event)) {
    return event;
  }

  const message = ajv.errorsText(validateWorkerProgressEvent.errors, {
    separator: "; ",
  });
  throw new Error(`Invalid worker progress event payload: ${message}`);
}
