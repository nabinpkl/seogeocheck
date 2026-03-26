import { assertValidWorkerProgressEvent } from "../contracts/schemaValidation.js";

const STAGE_PROGRESS = {
  source_capture_complete: 25,
  preflight_complete: 40,
  sitewide_discovery_complete: 50,
  sitewide_sampling_complete: 55,
  rendered_capture_complete: 60,
  rendered_capture_unavailable: 60,
  finalizing_report: 90,
};

function isoNow() {
  return new Date().toISOString();
}

export function createStageEvent(jobId, stage, message) {
  return assertValidWorkerProgressEvent({
    schemaVersion: 1,
    eventId: `${jobId}:stage:${stage}`,
    jobId,
    producer: "seo-audit-worker",
    eventType: "status",
    status: "STREAMING",
    emittedAt: isoNow(),
    message,
    stage,
    progress: STAGE_PROGRESS[stage] ?? null,
  });
}

export function createCheckEvent(jobId, check) {
  return assertValidWorkerProgressEvent({
    schemaVersion: 1,
    eventId: `${jobId}:rule:${check.id}`,
    jobId,
    producer: "seo-audit-worker",
    eventType: "check",
    status: "STREAMING",
    emittedAt: isoNow(),
    message: check.label,
    ruleId: check.id,
    checkStatus: check.status,
    severity: check.severity ?? null,
    instruction: check.instruction ?? null,
    detail: check.detail ?? null,
    selector: check.selector ?? null,
    metric: check.metric ?? null,
  });
}

export function createWorkerErrorEvent(jobId, error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error?.message === "string"
        ? error.message
        : "The SEO audit worker could not finish this step.";

  return assertValidWorkerProgressEvent({
    schemaVersion: 1,
    eventId: `${jobId}:error:worker`,
    jobId,
    producer: "seo-audit-worker",
    eventType: "error",
    status: "FAILED",
    emittedAt: isoNow(),
    message,
  });
}
