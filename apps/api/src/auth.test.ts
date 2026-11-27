import { describe, expect, it } from "vitest";

import { createToken, hashToken } from "./auth";

describe("createToken", () => {
  it("is wl_ plus 43 base64url characters", () => {
    expect(createToken()).toMatch(/^wl_[A-Za-z0-9_-]{43}$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, createToken));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("is the SHA-256 hex digest", async () => {
    // Known value: SHA-256 of "abc".
    expect(await hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
