import { Configuration } from "crawlee";
import { join } from "node:path";
import { tmpdir } from "node:os";

type StorageClientOptions = {
  localDataDirectory: string;
};

export function getAuditStorageRoot(jobId: string) {
  return join(tmpdir(), `seogeo-audit-${jobId}`);
}

export function getAuditPhaseStorageDir(jobId: string, phase: string) {
  return join(getAuditStorageRoot(jobId), phase);
}

export function createAuditPhaseConfig(jobId: string, phase: string) {
  const storageClientOptions: StorageClientOptions = {
    localDataDirectory: getAuditPhaseStorageDir(jobId, phase),
  };

  return new Configuration({ storageClientOptions });
}
