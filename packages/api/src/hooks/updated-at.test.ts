import { describe, expect, it } from "vitest";

import { newestUpdate } from "./updated-at";

describe("newestUpdate", () => {
  it("picks the most recent time", () => {
    expect(
      newestUpdate(["2026-11-18T12:00:00.000Z", "2026-11-18T12:00:30.000Z"]),
    ).toBe(Date.parse("2026-11-18T12:00:30.000Z"));
  });

  it("ignores missing and unreadable times", () => {
    expect(newestUpdate([null, "not a date", "2026-11-18T12:00:00.000Z"])).toBe(
      Date.parse("2026-11-18T12:00:00.000Z"),
    );
  });

  it("returns null when no time is usable, so the label is hidden", () => {
    expect(newestUpdate([])).toBeNull();
    expect(newestUpdate([null, "garbage"])).toBeNull();
  });
});
