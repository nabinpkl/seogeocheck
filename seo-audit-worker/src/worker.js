import { CheerioCrawler } from "crawlee";
import { NativeConnection, Worker } from "@temporalio/worker";
import { toSeoAuditFailure } from "./errors.js";
import { normalizeSeoAuditResult } from "./normalize.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const SEO_AUDIT_TASK_QUEUE = process.env.SEO_AUDIT_TASK_QUEUE ?? "seogeo-seo-signals";

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

function readNamedMeta($, name) {
  const value = $(`meta[name="${name}"]`).attr("content");
  return normalizeText(value);
}

function readPropertyMeta($, property) {
  const value = $(`meta[property="${property}"]`).attr("content");
  return normalizeText(value);
}

function countWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
}

async function runSeoAudit(jobId, targetUrl) {
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    throw new Error("A target URL is required.");
  }

  console.log(`[seo-audit-worker] starting audit ${jobId} for ${targetUrl}`);

  let auditResult = null;

  try {
    const crawler = new CheerioCrawler({
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      requestHandler: async ({ request, response, $ }) => {
        const finalUrl = request.loadedUrl ?? request.url;

        auditResult = normalizeSeoAuditResult({
          requestedUrl: targetUrl,
          finalUrl,
          statusCode: response?.statusCode ?? null,
          contentType: response?.headers?.["content-type"] ?? null,
          title: $("title").first().text(),
          metaDescription: readNamedMeta($, "description"),
          canonicalUrl: $('link[rel="canonical"]').attr("href") ?? null,
          h1Count: $("h1").length,
          lang: $("html").attr("lang") ?? null,
          robotsContent: readNamedMeta($, "robots"),
          openGraphTitle: readPropertyMeta($, "og:title"),
          openGraphDescription: readPropertyMeta($, "og:description"),
          wordCount: countWords($("body").text()),
        });
      },
    });

    await crawler.run([targetUrl]);

    if (!auditResult) {
      throw new Error("The SEO audit worker did not capture any page signals.");
    }

    return auditResult;
  } catch (error) {
    throw toSeoAuditFailure(error);
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
