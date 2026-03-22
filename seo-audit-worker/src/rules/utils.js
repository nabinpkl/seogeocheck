export function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

export function issueCheck(id, label, severity, instruction, detail, selector, metric, metadata) {
  return {
    id,
    label,
    status: "issue",
    severity,
    instruction,
    detail,
    selector,
    metric,
    metadata,
  };
}

export function passedCheck(id, label, detail, selector, metric, metadata) {
  return {
    id,
    label,
    status: "passed",
    severity: null,
    instruction: null,
    detail,
    selector,
    metric,
    metadata,
  };
}

export function notApplicableCheck(
  id,
  label,
  detail,
  selector,
  metric,
  metadata,
  instruction = null
) {
  return {
    id,
    label,
    status: "not_applicable",
    severity: null,
    instruction,
    detail,
    selector,
    metric,
    metadata,
  };
}

export function systemErrorCheck(
  id,
  label,
  detail,
  selector,
  metric,
  metadata,
  instruction = null
) {
  return {
    id,
    label,
    status: "system_error",
    severity: null,
    instruction,
    detail,
    selector,
    metric,
    metadata,
  };
}
