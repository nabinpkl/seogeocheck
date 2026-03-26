import test from "node:test";
import assert from "node:assert/strict";
import { compileAuditReportValidator } from "./reportSchema.js";

test("audit report schema modules compile through the shared Ajv loader", () => {
  assert.doesNotThrow(() => {
    const { validateReport } = compileAuditReportValidator();
    assert.equal(typeof validateReport, "function");
  });
});
