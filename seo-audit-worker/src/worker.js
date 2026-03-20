import { CheerioCrawler, Configuration, PlaywrightCrawler } from "crawlee";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NativeConnection, Worker } from "@temporalio/worker";
import { buildAuditResult } from "./audit/buildAuditResult.js";
import { collectRenderedDomSignals } from "./audit/collectRenderedDomSignals.js";
import { collectSourceHtmlSignals } from "./audit/collectPageSignals.js";
import { toSeoAuditFailure } from "./errors.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const SEO_AUDIT_TASK_QUEUE = process.env.SEO_AUDIT_TASK_QUEUE ?? "seogeo-seo-signals";
const RENDERED_SETTLE_TIME_MS = 1500;
const RENDERED_REQUEST_TIMEOUT_SECS = 10;
const RENDERED_NAVIGATION_TIMEOUT_SECS = 8;

async function captureSourceHtmlSignals(targetUrl, config) {
  let sourceSignals = null;
  const crawler = new CheerioCrawler(
    {
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      requestHandler: async ({ request, response, $ }) => {
        sourceSignals = collectSourceHtmlSignals({
          requestedUrl: targetUrl,
          request,
          response,
          $,
        });
      },
    },
    config
  );

  await crawler.run([targetUrl]);

  if (!sourceSignals) {
    throw new Error("The SEO audit worker did not capture any source HTML signals.");
  }

  return sourceSignals;
}

async function captureRenderedDomSignals(targetUrl, config) {
  let renderedSignals = null;
  const crawler = new PlaywrightCrawler(
    {
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      navigationTimeoutSecs: RENDERED_NAVIGATION_TIMEOUT_SECS,
      requestHandlerTimeoutSecs: RENDERED_REQUEST_TIMEOUT_SECS,
      preNavigationHooks: [
        async (_context, gotoOptions) => {
          gotoOptions.waitUntil = "load";
        },
      ],
      requestHandler: async ({ request, response, page }) => {
        renderedSignals = await collectRenderedDomSignals({
          requestedUrl: targetUrl,
          finalUrl: request.loadedUrl ?? request.url,
          response,
          page,
          settleTimeMs: RENDERED_SETTLE_TIME_MS,
        });
      },
    },
    config
  );

  await crawler.run([targetUrl]);

  if (!renderedSignals) {
    throw new Error("The rendered DOM pass did not capture comparable signals.");
  }

  return renderedSignals;
}

async function runSeoAudit(jobId, targetUrl) {
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    throw new Error("A target URL is required.");
  }

  console.log(`[seo-audit-worker] starting audit ${jobId} for ${targetUrl}`);

  let auditResult = null;
  const storageDir = join(tmpdir(), `seogeo-audit-${jobId}`);

  try {
    const config = new Configuration({ storageDir });
    const sourceSignals = await captureSourceHtmlSignals(targetUrl, config);
    let renderedSignals = null;
    let renderedError = null;

    try {
      renderedSignals = await captureRenderedDomSignals(targetUrl, config);
    } catch (error) {
      renderedError = error;
      console.warn(`[seo-audit-worker] rendered DOM comparison unavailable for ${jobId}:`, error);
    }

    auditResult = buildAuditResult({
      sourceInput: sourceSignals,
      renderedInput: renderedSignals,
      renderedError,
    });

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
