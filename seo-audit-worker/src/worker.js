import { CheerioCrawler, Configuration } from "crawlee";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NativeConnection, Worker } from "@temporalio/worker";
import { collectPageSignals } from "./audit/collectPageSignals.js";
import { toSeoAuditFailure } from "./errors.js";
import { normalizeSeoAuditResult } from "./normalize.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const SEO_AUDIT_TASK_QUEUE = process.env.SEO_AUDIT_TASK_QUEUE ?? "seogeo-seo-signals";

async function runSeoAudit(jobId, targetUrl) {
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    throw new Error("A target URL is required.");
  }

  console.log(`[seo-audit-worker] starting audit ${jobId} for ${targetUrl}`);

  let auditResult = null;
  const storageDir = join(tmpdir(), `seogeo-audit-${jobId}`);

  try {
    const config = new Configuration({ storageDir });
    const crawler = new CheerioCrawler(
      {
        maxConcurrency: 1,
        maxRequestsPerCrawl: 1,
        requestHandler: async ({ request, response, $ }) => {
          auditResult = normalizeSeoAuditResult(
            collectPageSignals({
              requestedUrl: targetUrl,
              request,
              response,
              $,
            })
          );
        },
      },
      config
    );

    await crawler.run([targetUrl]);

    if (!auditResult) {
      throw new Error("The SEO audit worker did not capture any page signals.");
    }

    return auditResult;
  } catch (error) {
    throw toSeoAuditFailure(error);
  } finally {
    try {
      await rm(storageDir, { recursive: true, force: true });
    } catch (rmError) {
      console.warn(`[seo-audit-worker] failed to cleanup storage for ${jobId}:`, rmError);
    }
  }
}

async function main() {
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: SEO_AUDIT_TASK_QUEUE,
    activities: {
      runSeoAudit,
    },
  });

  console.log(
    `[seo-audit-worker] polling Temporal at ${TEMPORAL_ADDRESS} in namespace ${TEMPORAL_NAMESPACE} on queue ${SEO_AUDIT_TASK_QUEUE}`
  );

  await worker.run();
}

main().catch((error) => {
  console.error("[seo-audit-worker] fatal error", error);
  process.exitCode = 1;
});
