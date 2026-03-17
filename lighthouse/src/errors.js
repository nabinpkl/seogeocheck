import { ApplicationFailure } from "@temporalio/common";

export const LIGHTHOUSE_URL_UNREACHABLE = "LIGHTHOUSE_URL_UNREACHABLE";
const CHROME_ERROR_URL_PREFIX = "chrome-error://";

const URL_UNREACHABLE_PATTERNS = [
  "dns servers could not resolve the provided domain.",
  "lighthouse was unable to reliably load the page you requested",
  "lighthouse was unable to reliably load the url you requested",
  "chrome prevented page load with an interstitial",
  "the url you have provided does not have a valid security certificate",
  "net::err_",
  "err_name_not_resolved",
  "err_name_resolution_failed",
  "err_dns_",
  "err_connection_refused",
  "err_connection_timed_out",
  "err_connection_closed",
  "err_connection_reset",
  "err_address_unreachable",
  "err_internet_disconnected",
  "err_ssl_",
  "econnrefused",
  "enotfound",
  "eai_again",
];

const RUNTIME_REACHABILITY_CODES = new Set([
  "DNS_FAILURE",
  "FAILED_DOCUMENT_REQUEST",
  "ERRORED_DOCUMENT_REQUEST",
  "INSECURE_DOCUMENT_REQUEST",
  "CHROME_INTERSTITIAL_ERROR",
  "NO_DOCUMENT_REQUEST",
]);

function getErrorMessage(error) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

function getRuntimeError(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const lhr = result.lhr;
  if (!lhr || typeof lhr !== "object") {
    return null;
  }

  return lhr.runtimeError && typeof lhr.runtimeError === "object"
    ? lhr.runtimeError
    : null;
}

function getFinalUrl(result) {
  if (!result || typeof result !== "object") {
    return "";
  }

  const lhr = result.lhr;
  if (!lhr || typeof lhr !== "object") {
    return "";
  }

  return typeof lhr.finalDisplayedUrl === "string"
    ? lhr.finalDisplayedUrl
    : typeof lhr.finalUrl === "string"
      ? lhr.finalUrl
      : "";
}

export function isReachabilityFailure(error) {
  const message = getErrorMessage(error).toLowerCase();
  return URL_UNREACHABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function getReachabilityFailureFromResult(result) {
  const runtimeError = getRuntimeError(result);
  const finalUrl = getFinalUrl(result);

  if (
    runtimeError &&
    typeof runtimeError.code === "string" &&
    RUNTIME_REACHABILITY_CODES.has(runtimeError.code)
  ) {
    return ApplicationFailure.nonRetryable(
      typeof runtimeError.message === "string" && runtimeError.message
        ? runtimeError.message
        : "The target URL could not be reached.",
      LIGHTHOUSE_URL_UNREACHABLE
    );
  }

  if (finalUrl.startsWith(CHROME_ERROR_URL_PREFIX)) {
    return ApplicationFailure.nonRetryable(
      "The target URL could not be reached.",
      LIGHTHOUSE_URL_UNREACHABLE
    );
  }

  return null;
}

export function toLighthouseFailure(error) {
  if (error instanceof ApplicationFailure) {
    return error;
  }

  if (isReachabilityFailure(error)) {
    const message = getErrorMessage(error) || "Lighthouse could not reach the requested URL.";
    return ApplicationFailure.nonRetryable(
      message,
      LIGHTHOUSE_URL_UNREACHABLE
    );
  }

  return error;
}
