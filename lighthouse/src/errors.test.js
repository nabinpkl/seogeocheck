import test from "node:test";
import assert from "node:assert/strict";
import { ApplicationFailure } from "@temporalio/common";
import {
  getReachabilityFailureFromResult,
  isReachabilityFailure,
  LIGHTHOUSE_URL_UNREACHABLE,
  toLighthouseFailure,
} from "./errors.js";

test("isReachabilityFailure detects Lighthouse DNS failures", () => {
  assert.equal(
    isReachabilityFailure(
      new Error("DNS servers could not resolve the provided domain.")
    ),
    true
  );
});

test("toLighthouseFailure wraps reachability failures as non-retryable", () => {
  const failure = toLighthouseFailure(
    new Error(
      "Lighthouse was unable to reliably load the page you requested. (Details: net::ERR_CONNECTION_REFUSED)"
    )
  );

  assert.equal(failure instanceof ApplicationFailure, true);
  assert.equal(failure.type, LIGHTHOUSE_URL_UNREACHABLE);
  assert.equal(failure.nonRetryable, true);
});

test("getReachabilityFailureFromResult maps runtimeError reachability results", () => {
  const failure = getReachabilityFailureFromResult({
    lhr: {
      finalDisplayedUrl: "chrome-error://chromewebdata/",
      runtimeError: {
        code: "CHROME_INTERSTITIAL_ERROR",
        message:
          "Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests.",
      },
    },
  });

  assert.equal(failure instanceof ApplicationFailure, true);
  assert.equal(failure?.type, LIGHTHOUSE_URL_UNREACHABLE);
  assert.equal(failure?.nonRetryable, true);
});
