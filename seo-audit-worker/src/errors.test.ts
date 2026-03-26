import test from "node:test";
import assert from "node:assert/strict";
import { ApplicationFailure } from "@temporalio/common";
import {
  TARGET_URL_UNREACHABLE,
  isReachabilityFailure,
  toSeoAuditFailure,
} from "./errors.js";

test("isReachabilityFailure detects DNS and connection failures", () => {
  assert.equal(isReachabilityFailure(new Error("getaddrinfo ENOTFOUND example.com")), true);
  assert.equal(isReachabilityFailure(new Error("connect ECONNREFUSED 127.0.0.1:443")), true);
});

test("toSeoAuditFailure wraps reachability failures as non-retryable", () => {
  const failure = toSeoAuditFailure(new Error("fetch failed: getaddrinfo ENOTFOUND example.com"));

  assert.equal(failure instanceof ApplicationFailure, true);
  assert.equal(failure.type, TARGET_URL_UNREACHABLE);
  assert.equal(failure.nonRetryable, true);
});
