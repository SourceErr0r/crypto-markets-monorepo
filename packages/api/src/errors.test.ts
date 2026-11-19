import { describe, expect, it } from "vitest";

import {
  ApiError,
  httpErrorMessage,
  isRetryable,
  parseRetryAfter,
  toDisplayError,
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

describe("toDisplayError", () => {
  it.each([
    [{ kind: "network" } as const, "offline"],
    [{ kind: "timeout" } as const, "timeout"],
    [{ kind: "http", status: 408 } as const, "timeout"],
    [{ kind: "http", status: 429 } as const, "rate-limited"],
    [{ kind: "http", status: 404 } as const, "not-found"],
    [{ kind: "http", status: 502 } as const, "unavailable"],
    [{ kind: "http", status: 400 } as const, "unknown"],
    [{ kind: "invalid-response" } as const, "unknown"],
  ])("describes %j as %s", (details, kind) => {
    expect(toDisplayError(new ApiError("msg", details)).kind).toBe(kind);
  });

  it("keeps the message and how long to wait", () => {
    const error = new ApiError("Slow down", {
      kind: "http",
      status: 429,
      retryAfterSeconds: 60,
    });
    expect(toDisplayError(error)).toEqual({
      kind: "rate-limited",
      message: "Slow down",
      retryAfterSeconds: 60,
    });
  });

  it("hides the message of any other error", () => {
    expect(toDisplayError(new TypeError("x is not a function"))).toEqual({
      kind: "unknown",
      message: UNKNOWN_ERROR_MESSAGE,
    });
    expect(toDisplayError("boom").message).toBe(UNKNOWN_ERROR_MESSAGE);
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
