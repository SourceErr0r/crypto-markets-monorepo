import { describe, expect, it } from "vitest";

import {
  ApiError,
  getErrorMessage,
  httpErrorMessage,
  isRetryable,
  parseRetryAfter,
  UNKNOWN_ERROR_MESSAGE,
} from "./errors";

describe("httpErrorMessage", () => {
  it.each([400, 404, 408, 429, 500, 502, 503, 504])(
    "has a message for HTTP %i",
    (status) => {
      expect(httpErrorMessage(status)).not.toBe(UNKNOWN_ERROR_MESSAGE);
    },
  );

  it("explains rate limits", () => {
    expect(httpErrorMessage(429)).toMatch(/too many requests/i);
  });

  it("treats unlisted server errors as unavailability, not the user's fault", () => {
    expect(httpErrorMessage(520)).toBe(httpErrorMessage(500));
  });

  it("falls back to a generic message for unknown client errors", () => {
    expect(httpErrorMessage(418)).toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it("never names the upstream provider or mentions keys", () => {
    for (const status of [400, 401, 403, 404, 408, 429, 500, 502, 503, 504]) {
      expect(httpErrorMessage(status)).not.toMatch(/coingecko|key/i);
    }
  });
});

describe("getErrorMessage", () => {
  it("returns the message of a ApiError", () => {
    expect(getErrorMessage(new ApiError("Try later", { kind: "http", status: 503 }))).toBe("Try later");
  });

  it("hides the message of any other error", () => {
    expect(getErrorMessage(new TypeError("x is not a function"))).toBe(
      UNKNOWN_ERROR_MESSAGE,
    );
    expect(getErrorMessage("boom")).toBe(UNKNOWN_ERROR_MESSAGE);
  });
});

describe("isRetryable", () => {
  it.each([408, 500, 502, 503, 504])("retries HTTP %i", (status) => {
    expect(isRetryable(new ApiError("x", { kind: "http", status }))).toBe(true);
  });

  it.each([400, 401, 403, 404, 429])("does not retry HTTP %i", (status) => {
    expect(isRetryable(new ApiError("x", { kind: "http", status }))).toBe(false);
  });

  it("retries network failures, which may be a passing connection drop", () => {
    expect(isRetryable(new ApiError("offline", { kind: "network" }))).toBe(true);
  });

  it("retries timeouts", () => {
    expect(isRetryable(new ApiError("slow", { kind: "timeout" }))).toBe(true);
  });

  it("does not retry a response that failed validation", () => {
    expect(isRetryable(new ApiError("bad", { kind: "invalid-response" }))).toBe(
      false,
    );
  });

  it("does not retry errors from our own code", () => {
    expect(isRetryable(new TypeError("x is not a function"))).toBe(false);
  });
});

describe("parseRetryAfter", () => {
  it("reads a number of seconds", () => {
    expect(parseRetryAfter("60")).toBe(60);
    expect(parseRetryAfter(" 0 ")).toBe(0);
  });

  it.each([null, "", "soon", "-5", "1.5", "Wed, 21 Oct 2026 07:28:00 GMT"])(
    "ignores %j rather than guessing",
    (header) => {
      expect(parseRetryAfter(header)).toBeUndefined();
    },
  );
});
