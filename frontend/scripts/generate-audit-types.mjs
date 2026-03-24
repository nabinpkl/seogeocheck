import { watch } from "node:fs";
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

const watchMode = process.argv.includes("--watch");
let pendingGeneration = null;

async function generateTypes() {
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

  console.log("[generate-audit-types] Generated frontend audit types from JSON Schema.");
}

function queueGeneration(reason) {
  if (pendingGeneration) {
    return pendingGeneration;
  }

  pendingGeneration = (async () => {
    if (reason) {
      console.log(`[generate-audit-types] Regenerating after ${reason}.`);
    }
    try {
      await generateTypes();
    } finally {
      pendingGeneration = null;
    }
  })();

  return pendingGeneration;
}

await queueGeneration();

if (watchMode) {
  console.log("[generate-audit-types] Watching audit schemas for changes.");
  for (const schema of schemas) {
    watch(schema.source, () => {
      void queueGeneration(`change in ${schema.source.split("/").pop()}`);
    });
  }

  await new Promise(() => {});
}
