import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");
const schemaDir = resolve(frontendDir, "..", "schemas", "audit");
const outputDir = resolve(frontendDir, "src", "types", "generated");

const schemas = [
  {
    source: resolve(schemaDir, "audit-report.schema.json"),
    output: resolve(outputDir, "audit-report.ts"),
  },
  {
    source: resolve(schemaDir, "audit-stream-event.schema.json"),
    output: resolve(outputDir, "audit-stream-event.ts"),
  },
];

await mkdir(outputDir, { recursive: true });

for (const schema of schemas) {
  const compiled = await compileFromFile(schema.source, {
    bannerComment:
      "/* eslint-disable */\n/**\n * This file is generated from JSON Schema.\n * Do not edit it by hand.\n */",
    style: {
      singleQuote: true,
    },
  });

  await writeFile(schema.output, compiled);
}
