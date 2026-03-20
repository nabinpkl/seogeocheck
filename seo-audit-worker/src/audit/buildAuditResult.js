import { normalizeSeoAuditResult } from "../normalize.js";

export function buildAuditResult({ sourceInput, renderedInput = null, renderedError = null }) {
  return normalizeSeoAuditResult({
    ...sourceInput,
    renderedDom: renderedInput,
    renderedError:
      renderedError instanceof Error
        ? {
            message: renderedError.message,
          }
        : renderedError,
  });
}
