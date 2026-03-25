import { Configuration } from "crawlee";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function getAuditStorageRoot(jobId) {
  return join(tmpdir(), `seogeo-audit-${jobId}`);
}

export function getAuditPhaseStorageDir(jobId, phase) {
  return join(getAuditStorageRoot(jobId), phase);
}

export function createAuditPhaseConfig(jobId, phase) {
  return new Configuration({
    storageDir: getAuditPhaseStorageDir(jobId, phase),
  });
}
