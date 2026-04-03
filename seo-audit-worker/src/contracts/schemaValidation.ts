import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { ErrorObject } from "ajv";

const require = createRequire(import.meta.url);

type JsonData = ReturnType<typeof JSON.parse>;
type ValidateFunction = {
  (payload: JsonData): boolean;
  errors?: ErrorObject[] | null;
};
type AjvApi = {
  compile: (schema: JsonData) => ValidateFunction;
  errorsText: (errors: ErrorObject[] | null | undefined, options?: { separator?: string }) => string;
};
type AjvConstructor = new (options: { allErrors: boolean; strict: boolean }) => AjvApi;
type AddFormats = (instance: AjvApi) => void;

const Ajv2020 = require("ajv/dist/2020.js").default as AjvConstructor;
const addFormats = require("ajv-formats").default as AddFormats;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

const workerProgressEventSchema = JSON.parse(
  readFileSync(
    new URL("../../../schemas/audit/internal/audit-worker-progress-event.schema.json", import.meta.url),
    "utf8"
  )
);

const validateWorkerProgressEvent = ajv.compile(workerProgressEventSchema);

export function assertValidWorkerProgressEvent<T>(event: T): T {
  if (validateWorkerProgressEvent(event)) {
    return event;
  }

  const message = ajv.errorsText(validateWorkerProgressEvent.errors, {
    separator: "; ",
  });
  throw new Error(`Invalid worker progress event payload: ${message}`);
}
