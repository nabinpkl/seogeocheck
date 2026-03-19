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
