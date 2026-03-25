import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const reportSchemaPath = new URL("../../../schemas/audit/audit-report.schema.json", import.meta.url);
const reportModuleDirectoryUrl = new URL("../../../schemas/audit/report/", import.meta.url);

function readJson(filePath) {
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
