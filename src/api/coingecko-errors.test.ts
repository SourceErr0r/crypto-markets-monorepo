import {
  CoinGeckoError,
  getErrorMessage,
  httpErrorMessage,
  isRetryable,
  UNKNOWN_ERROR_MESSAGE,
} from "@/api/coingecko-errors";

describe("httpErrorMessage", () => {
  it.each([400, 401, 403, 404, 408, 429, 500, 502, 503, 504])(
    "has a message for HTTP %i",
    (status) => {
      expect(httpErrorMessage(status)).not.toBe(UNKNOWN_ERROR_MESSAGE);
    },
  );

  it("explains rate limits", () => {
    expect(httpErrorMessage(429)).toMatch(/too many requests/i);
  });

  it.each([10002, 10005, 10010, 10011])(
    "uses the CoinGecko error code %i over the status",
    (code) => {
      expect(httpErrorMessage(400, code)).not.toBe(httpErrorMessage(400));
    },
  );

  it("treats unlisted server errors as CoinGecko's fault", () => {
    expect(httpErrorMessage(520)).toBe(httpErrorMessage(500));
  });

  it("falls back to a generic message for unknown client errors and codes", () => {
    expect(httpErrorMessage(418)).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(httpErrorMessage(418, 99999)).toBe(UNKNOWN_ERROR_MESSAGE);
  });
});

describe("getErrorMessage", () => {
  it("returns the message of a CoinGeckoError", () => {
    expect(getErrorMessage(new CoinGeckoError("Try later"))).toBe("Try later");
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
    expect(isRetryable(new CoinGeckoError("x", { status }))).toBe(true);
  });

  it.each([400, 401, 403, 404, 429])("does not retry HTTP %i", (status) => {
    expect(isRetryable(new CoinGeckoError("x", { status }))).toBe(false);
  });

  it("retries failures without a status, such as network errors", () => {
    expect(isRetryable(new CoinGeckoError("offline"))).toBe(true);
    expect(isRetryable(new TypeError("unexpected"))).toBe(true);
  });
});
