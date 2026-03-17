import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { NativeConnection, Worker } from "@temporalio/worker";
import {
  getReachabilityFailureFromResult,
  toLighthouseFailure,
} from "./errors.js";
import { normalizeLighthouseResult } from "./normalize.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? "default";
const LIGHTHOUSE_TASK_QUEUE = process.env.LIGHTHOUSE_TASK_QUEUE ?? "seogeo-lighthouse";
const CHROME_PATH = process.env.CHROME_PATH;

async function runAudit(url) {
  const chrome = await launch({
    chromePath: CHROME_PATH,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });

    const reachabilityFailure = getReachabilityFailureFromResult(runnerResult);
    if (reachabilityFailure) {
      throw reachabilityFailure;
    }

    return normalizeLighthouseResult(runnerResult, url);
  } catch (error) {
    throw toLighthouseFailure(error);
  } finally {
    await chrome.kill();
  }
}

async function runLighthouseAudit(jobId, targetUrl) {
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    throw new Error("A target URL is required.");
  }

  console.log(`[lighthouse-worker] starting audit ${jobId} for ${targetUrl}`);
  return runAudit(targetUrl);
}

async function main() {
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: LIGHTHOUSE_TASK_QUEUE,
    activities: {
      runLighthouseAudit,
    },
  });

  console.log(
    `[lighthouse-worker] polling Temporal at ${TEMPORAL_ADDRESS} in namespace ${TEMPORAL_NAMESPACE} on queue ${LIGHTHOUSE_TASK_QUEUE}`
  );

  await worker.run();
}

main().catch((error) => {
  console.error("[lighthouse-worker] fatal error", error);
  process.exitCode = 1;
});
