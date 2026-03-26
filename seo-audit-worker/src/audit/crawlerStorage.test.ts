import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuditPhaseConfig,
  getAuditPhaseStorageDir,
  getAuditStorageRoot,
} from "./crawlerStorage.js";

type StorageClientOptions = {
  localDataDirectory?: string;
};

test("crawler storage isolates source and rendered passes under one audit root", () => {
  const jobId = "audit_test123";
  const root = getAuditStorageRoot(jobId);
  const sourceDir = getAuditPhaseStorageDir(jobId, "source");
  const renderedDir = getAuditPhaseStorageDir(jobId, "rendered");
  const sourceConfig = createAuditPhaseConfig(jobId, "source");
  const renderedConfig = createAuditPhaseConfig(jobId, "rendered");
  const sourceOptions = sourceConfig.get("storageClientOptions") as StorageClientOptions;
  const renderedOptions = renderedConfig.get("storageClientOptions") as StorageClientOptions;

  assert.match(sourceDir, /seogeo-audit-audit_test123/);
  assert.equal(sourceDir.startsWith(root), true);
  assert.equal(renderedDir.startsWith(root), true);
  assert.notEqual(sourceDir, renderedDir);
  assert.equal(sourceOptions.localDataDirectory, sourceDir);
  assert.equal(renderedOptions.localDataDirectory, renderedDir);
});
