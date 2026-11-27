import { describe, expect, it } from "vitest";

import { coinIdSchema, preferencesPatchSchema } from "./watchlist-schemas";

describe("coinIdSchema", () => {
  it.each(["bitcoin", "usd-coin", "0x", "wrapped-steth", "a.b_c"])("accepts %s", (id) => {
    expect(coinIdSchema.safeParse(id).success).toBe(true);
  });

  it.each(["", "Bitcoin", ".", "..", "-coin", "a/b", "a b", "a".repeat(101)])("rejects %j", (id) => {
    expect(coinIdSchema.safeParse(id).success).toBe(false);
  });
});

describe("preferencesPatchSchema", () => {
  it("accepts any subset of the preferences", () => {
    expect(preferencesPatchSchema.parse({ theme: "dark" })).toEqual({ theme: "dark" });
    expect(preferencesPatchSchema.parse({ currency: "usd", theme: "system" })).toEqual({
      currency: "usd",
      theme: "system",
    });
  });

  it("rejects an empty patch", () => {
    expect(preferencesPatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields, so typos fail loudly", () => {
    expect(preferencesPatchSchema.safeParse({ curency: "usd" }).success).toBe(false);
  });

  it("rejects values outside the lists, including null", () => {
    expect(preferencesPatchSchema.safeParse({ currency: "btc" }).success).toBe(false);
    expect(preferencesPatchSchema.safeParse({ theme: "blue" }).success).toBe(false);
    expect(preferencesPatchSchema.safeParse({ theme: null }).success).toBe(false);
  });
});
