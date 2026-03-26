import { CheerioCrawler, PlaywrightCrawler } from "crawlee";
import type { Configuration } from "crawlee";
import { rm } from "node:fs/promises";
import { NativeConnection, Worker } from "@temporalio/worker";
import { buildSeoAuditResultFromEvaluation, evaluateAudit } from "./audit/buildAuditResult.js";
import { collectRenderedDomSignals } from "./audit/collectRenderedDomSignals.js";
import { createAuditPhaseConfig, getAuditStorageRoot } from "./audit/crawlerStorage.js";
import { collectIndexabilityPreflight } from "./audit/indexabilityPreflight.js";
import { collectSourceHtmlSignals } from "./audit/collectPageSignals.js";
import {
  collectSitewideSignals,
  discoverSitewideContext,
} from "./audit/collectSitewideSignals.js";
import { toSeoAuditFailure } from "./errors.js";
import {
  createCheckEvent,
  createStageEvent,
  createWorkerErrorEvent,
} from "./progress/auditProgressEvents.js";
import {
  disconnectAuditProgressProducer,
  emitProgressEvent,
  getAuditProgressProducer,
} from "./progress/kafkaProgressProducer.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const SEO_AUDIT_TASK_QUEUE = process.env.SEO_AUDIT_TASK_QUEUE ?? "seogeo-seo-signals";
const RENDERED_SETTLE_TIME_MS = 1500;
const RENDERED_REQUEST_TIMEOUT_SECS = 10;
const RENDERED_NAVIGATION_TIMEOUT_SECS = 8;

type AnyValue = ReturnType<typeof JSON.parse>;
type AnyObject = Record<string, AnyValue>;

async function captureSourceHtmlSignals(
  targetUrl: string,
  config: Configuration,
  preflight: AnyObject = {}
) {
  let sourceSignals: AnyObject | null = null;
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
          preflight,
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

async function captureRenderedDomSignals(targetUrl: string, config: Configuration) {
  let renderedSignals: AnyObject | null = null;
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

async function runSeoAudit(jobId: string, targetUrl: string) {
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    throw new Error("A target URL is required.");
  }

  console.log(`[seo-audit-worker] starting audit ${jobId} for ${targetUrl}`);

  let auditResult = null;
  const storageDir = getAuditStorageRoot(jobId);

  try {
    const sourceSignals = await captureSourceHtmlSignals(
      targetUrl,
      createAuditPhaseConfig(jobId, "source")
    );
    await emitProgressEvent(
      createStageEvent(jobId, "source_capture_complete", "Collected source HTML signals.")
    );

    const preflight = await collectIndexabilityPreflight({
      requestedUrl: targetUrl,
      finalUrl: sourceSignals.finalUrl,
      htmlCanonicalLinks: sourceSignals.htmlCanonicalLinks,
    });
    await emitProgressEvent(
      createStageEvent(jobId, "preflight_complete", "Checked crawl and canonical prerequisites.")
    );

    const sitewideDiscovery = await discoverSitewideContext({
      finalUrl: sourceSignals.finalUrl,
      currentPageSourceAnchors: sourceSignals.sourceAnchors,
    });
    await emitProgressEvent(
      createStageEvent(
        jobId,
        "sitewide_discovery_complete",
        "Resolved sitewide foundations, robots.txt, and sitemap discovery."
      )
    );

    const sitewideSignals = await collectSitewideSignals({
      currentPageFinalUrl: sourceSignals.finalUrl,
      discovery: sitewideDiscovery,
    });
    await emitProgressEvent(
      createStageEvent(
        jobId,
        "sitewide_sampling_complete",
        "Evaluated a sitewide sample of URLs."
      )
    );

    let renderedSignals: AnyObject | null = null;
    let renderedError: Error | { message: string } | null = null;

    try {
      renderedSignals = await captureRenderedDomSignals(
        targetUrl,
        createAuditPhaseConfig(jobId, "rendered")
      );
      await emitProgressEvent(
        createStageEvent(jobId, "rendered_capture_complete", "Rendered comparison is ready.")
      );
    } catch (error) {
      renderedError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[seo-audit-worker] rendered DOM comparison unavailable for ${jobId}:`, error);
      await emitProgressEvent(
        createStageEvent(
          jobId,
          "rendered_capture_unavailable",
          "Rendered comparison was unavailable; continuing with source findings."
        )
      );
    }

    const evaluation = evaluateAudit({
      sourceInput: {
        ...sourceSignals,
        ...preflight,
      },
      sitewideInput: sitewideSignals,
      renderedInput: renderedSignals,
      renderedError,
    });
    for (const check of evaluation.sourceChecks) {
      await emitProgressEvent(createCheckEvent(jobId, check));
    }
    for (const check of evaluation.sitewideChecks) {
      await emitProgressEvent(createCheckEvent(jobId, check));
    }
    for (const check of evaluation.comparison.checks) {
      await emitProgressEvent(createCheckEvent(jobId, check));
    }
    await emitProgressEvent(
      createStageEvent(jobId, "finalizing_report", "Preparing the final signed report.")
    );

    auditResult = buildSeoAuditResultFromEvaluation(evaluation);

    return auditResult;
  } catch (error) {
    try {
      await emitProgressEvent(createWorkerErrorEvent(jobId, error));
    } catch (emitError) {
      console.warn(`[seo-audit-worker] failed to emit Kafka error event for ${jobId}:`, emitError);
    }
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
  await getAuditProgressProducer();

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
  disconnectAuditProgressProducer().catch((disconnectError) => {
    console.error("[seo-audit-worker] failed to disconnect Kafka producer", disconnectError);
  });
  process.exitCode = 1;
});
