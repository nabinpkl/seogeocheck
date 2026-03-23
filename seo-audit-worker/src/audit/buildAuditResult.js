import { buildSeoAuditResultFromEvaluation, evaluateSeoAudit } from "../normalize.js";

export { buildSeoAuditResultFromEvaluation };

export function evaluateAudit({ sourceInput, renderedInput = null, renderedError = null }) {
  return evaluateSeoAudit({
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

export function buildAuditResult({ sourceInput, renderedInput = null, renderedError = null }) {
  return buildSeoAuditResultFromEvaluation(
    evaluateAudit({
      sourceInput,
      renderedInput,
      renderedError,
    })
  );
}
