import type { DisplayError } from "@crypto-markets/api";

import { formatWait, refreshErrorMessage } from "@/utils/error-copy";
import { formatTime } from "@/utils/formatters";

const updatedAt = new Date(2026, 10, 19, 14, 5).getTime();
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
  it("says when the data on screen is from while offline", () => {
    expect(refreshErrorMessage(error({ kind: "offline" }), updatedAt)).toBe(
      "Can't connect · showing prices from 14:05",
    );
  });

  it("tells the user how long to wait when the server said", () => {
    expect(
      refreshErrorMessage(
        error({ kind: "rate-limited", retryAfterSeconds: 60 }),
        updatedAt,
      ),
    ).toBe("Couldn't refresh · try again in 1 min");
  });

  it("uses a general message for other failures", () => {
    expect(refreshErrorMessage(error({ kind: "unavailable" }), updatedAt)).toBe(
      "Couldn't refresh · showing prices from 14:05",
    );
  });

  it("ignores a zero wait, which gives the user nothing to act on", () => {
    expect(
      refreshErrorMessage(error({ retryAfterSeconds: 0 }), updatedAt),
    ).toBe("Couldn't refresh · showing prices from 14:05");
  });

  it("leaves out the time when nothing has loaded yet", () => {
    expect(refreshErrorMessage(error({ kind: "offline" }), null)).toBe(
      "Can't connect",
    );
  });
});

describe("formatTime", () => {
  it("uses a 24-hour clock", () => {
    expect(formatTime(updatedAt)).toBe("14:05");
  });
});
