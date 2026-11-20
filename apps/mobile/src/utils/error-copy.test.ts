import type { DisplayError } from "@crypto-markets/api";

import { formatWait, refreshErrorMessage } from "@/utils/error-copy";

const updatedAt = Date.parse("2026-11-19T14:05:00Z");
const now = updatedAt + 12 * 60 * 1000;
const error = (details: Partial<DisplayError>): DisplayError => ({
  kind: "unknown",
  message: "Something went wrong",
  ...details,
});

describe("formatWait", () => {
  it("shows short waits in seconds and longer ones in whole minutes", () => {
    expect(formatWait(45)).toBe("45 s");
    expect(formatWait(60)).toBe("1 min");
    expect(formatWait(61)).toBe("2 min");
  });
});

describe("refreshErrorMessage", () => {
  it("says how old the data on screen is while offline", () => {
    expect(refreshErrorMessage(error({ kind: "offline" }), updatedAt, now)).toBe(
      "Can't connect · prices updated 12 min ago",
    );
  });

  it("tells the user how long to wait when the server said", () => {
    expect(
      refreshErrorMessage(
        error({ kind: "rate-limited", retryAfterSeconds: 60 }),
        updatedAt,
        now,
      ),
    ).toBe("Couldn't refresh · try again in 1 min");
  });

  it("uses a general message for other failures", () => {
    expect(
      refreshErrorMessage(error({ kind: "unavailable" }), updatedAt, now),
    ).toBe("Couldn't refresh · prices updated 12 min ago");
  });

  it("ignores a zero wait, which gives the user nothing to act on", () => {
    expect(
      refreshErrorMessage(error({ retryAfterSeconds: 0 }), updatedAt, now),
    ).toBe("Couldn't refresh · prices updated 12 min ago");
  });

  it("leaves out the age when the data has no time", () => {
    expect(refreshErrorMessage(error({ kind: "offline" }), null, now)).toBe(
      "Can't connect",
    );
  });
});
