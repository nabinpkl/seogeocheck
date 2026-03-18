import { ApplicationFailure } from "@temporalio/common";

export const TARGET_URL_UNREACHABLE = "TARGET_URL_UNREACHABLE";

const URL_UNREACHABLE_PATTERNS = [
  "enotfound",
  "eai_again",
  "econnrefused",
  "ehostunreach",
  "enetunreach",
  "etimedout",
  "timeout awaiting",
  "socket hang up",
  "fetch failed",
  "getaddrinfo",
  "unable to connect",
  "connection refused",
  "connection reset",
];

function getErrorMessage(error) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

export function isReachabilityFailure(error) {
  const message = getErrorMessage(error).toLowerCase();
  return URL_UNREACHABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function toSeoAuditFailure(error) {
  if (error instanceof ApplicationFailure) {
    return error;
  }

  if (isReachabilityFailure(error)) {
    const message = getErrorMessage(error) || "The target URL could not be reached.";
    return ApplicationFailure.nonRetryable(message, TARGET_URL_UNREACHABLE);
  }

  return error;
}
