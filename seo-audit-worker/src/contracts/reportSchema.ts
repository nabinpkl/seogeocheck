import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject } from "ajv";

const reportSchemaPath = new URL("../../../schemas/audit/audit-report.schema.json", import.meta.url);
const reportModuleDirectoryUrl = new URL("../../../schemas/audit/report/", import.meta.url);
const require = createRequire(import.meta.url);

type JsonData = ReturnType<typeof JSON.parse>;
type ValidateFunction = {
  (payload: JsonData): boolean;
  errors?: ErrorObject[] | null;
};
type AjvApi = {
  addSchema: (schema: JsonData) => AjvApi;
  compile: (schema: JsonData) => ValidateFunction;
  errorsText: (errors: ErrorObject[] | null | undefined, options?: { separator?: string }) => string;
};
type AjvConstructor = new (options: { allErrors: boolean; strict: boolean }) => AjvApi;
type AddFormats = (instance: AjvApi) => void;

const Ajv2020 = require("ajv/dist/2020.js").default as AjvConstructor;
const addFormats = require("ajv-formats").default as AddFormats;

function readJson(filePath: string | URL) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function loadAuditReportSchemaBundle() {
  const moduleDirectoryPath = fileURLToPath(reportModuleDirectoryUrl);
  const moduleSchemas = readdirSync(moduleDirectoryPath)
    .filter((fileName) => extname(fileName) === ".json")
    .sort()
    .map((fileName) => readJson(join(moduleDirectoryPath, fileName)));

  return {
    entrySchema: readJson(reportSchemaPath),
    moduleSchemas,
  };
}

export function createAuditReportAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });

  addFormats(ajv);
  return ajv;
}

export function compileAuditReportValidator() {
  const { entrySchema, moduleSchemas } = loadAuditReportSchemaBundle();
  const ajv = createAuditReportAjv();

  for (const schema of moduleSchemas) {
    ajv.addSchema(schema);
  }

  const validateReport = ajv.compile(entrySchema);

  return {
    ajv,
    entrySchema,
    validateReport,
  };
}
