import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { MAX_RETRY_AFTER_SECONDS, retryDelay, shouldRetry } from "./retry";

const networkError = new ApiError("offline", { kind: "network" });
const rateLimited = (retryAfterSeconds: number) =>
  new ApiError("slow down", { kind: "http", status: 429, retryAfterSeconds });

describe("shouldRetry", () => {
  it("retries a transient failure twice, then gives up", () => {
    expect(shouldRetry(0, networkError)).toBe(true);
    expect(shouldRetry(1, networkError)).toBe(true);
    expect(shouldRetry(2, networkError)).toBe(false);
  });

  it("never retries an error that won't change, such as a 404", () => {
    expect(
      shouldRetry(0, new ApiError("missing", { kind: "http", status: 404 })),
    ).toBe(false);
  });

  it("does not retry a 429 that gives no Retry-After", () => {
    expect(shouldRetry(0, new ApiError("x", { kind: "http", status: 429 }))).toBe(
      false,
    );
  });

  it("retries once after a short Retry-After", () => {
    const error = rateLimited(MAX_RETRY_AFTER_SECONDS);
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(false);
  });

  it("surfaces a long Retry-After straight away instead of waiting", () => {
    expect(shouldRetry(0, rateLimited(60))).toBe(false);
  });

  it("lets Retry-After override the usual rule for server errors", () => {
    const busy = new ApiError("busy", {
      kind: "http",
      status: 503,
      retryAfterSeconds: 300,
    });
    expect(shouldRetry(0, busy)).toBe(false);
  });

  it("does not retry errors from our own code", () => {
    expect(shouldRetry(0, new TypeError("x is not a function"))).toBe(false);
  });
});

describe("retryDelay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits exactly as long as Retry-After asks", () => {
    expect(retryDelay(0, rateLimited(5))).toBe(5000);
  });

  it("backs off exponentially, up to a cap", () => {
    // No jitter: Math.random() = 1 gives the full delay.
    vi.spyOn(Math, "random").mockReturnValue(1);
    expect(retryDelay(0, networkError)).toBe(1000);
    expect(retryDelay(1, networkError)).toBe(2000);
    expect(retryDelay(10, networkError)).toBe(8000);
  });

  it("adds jitter so clients don't retry in lockstep", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(retryDelay(1, networkError)).toBe(1000);
  });
});
