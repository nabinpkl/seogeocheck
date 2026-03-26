import type { JsonInput, JsonObject } from "../types/json.js";

export type CheckSeverity = "high" | "medium" | "low";

export type CheckResult = {
  id: string;
  label: string;
  status: "issue" | "passed" | "not_applicable" | "system_error";
  severity: CheckSeverity | null;
  instruction: string | null;
  detail: string | null;
  selector: string | null;
  metric: string | null;
  metadata: JsonObject | null;
};

export function normalizeText(value: JsonInput): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

export function issueCheck(
  id: string,
  label: string,
  severity: CheckSeverity,
  instruction: string,
  detail: string,
  selector: string | null,
  metric: string | null,
  metadata: JsonObject | null
): CheckResult {
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

export function passedCheck(
  id: string,
  label: string,
  detail: string,
  selector: string | null,
  metric: string | null,
  metadata: JsonObject | null
): CheckResult {
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
  id: string,
  label: string,
  detail: string,
  selector: string | null,
  metric: string | null,
  metadata: JsonObject | null,
  instruction: string | null = null
): CheckResult {
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
  id: string,
  label: string,
  detail: string,
  selector: string | null,
  metric: string | null,
  metadata: JsonObject | null,
  instruction: string | null = null
): CheckResult {
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
