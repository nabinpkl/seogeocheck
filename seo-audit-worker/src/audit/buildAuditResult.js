import { buildSeoAuditResultFromEvaluation, evaluateSeoAudit } from "../normalize.js";

export { buildSeoAuditResultFromEvaluation };

export function evaluateAudit({
  sourceInput,
  sitewideInput = null,
  renderedInput = null,
  renderedError = null,
}) {
  return evaluateSeoAudit({
    ...sourceInput,
    sitewide: sitewideInput,
    renderedDom: renderedInput,
    renderedError:
      renderedError instanceof Error
        ? {
            message: renderedError.message,
          }
        : renderedError,
  });
}

export function buildAuditResult({
  sourceInput,
  sitewideInput = null,
  renderedInput = null,
  renderedError = null,
}) {
  return buildSeoAuditResultFromEvaluation(
    evaluateAudit({
      sourceInput,
      sitewideInput,
      renderedInput,
      renderedError,
    })
  );
}
