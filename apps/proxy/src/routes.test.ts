import { describe, expect, it } from "vitest";

import { matchRoute } from "./routes";

function match(path: string) {
  return matchRoute(new URL(path, "http://proxy.test"));
}

function upstreamPath(path: string) {
  const result = match(path);
  if (!result.ok) throw new Error(`Expected ${path} to match, got ${result.error.code}`);
  return result.route.upstreamPath;
}

describe("matchRoute", () => {
  it("rebuilds markets requests in a fixed form, so equivalent requests share a cache key", () => {
    const expected = "/coins/markets?vs_currency=gbp&order=market_cap_desc&per_page=10&page=1";
    expect(upstreamPath("/coins/markets?vs_currency=gbp")).toBe(expected);
    expect(upstreamPath("/coins/markets?page=1&junk=x&order=volume_desc&vs_currency=GBP")).toBe(expected);
  });

  it("keeps the currency out of the coin detail URL and returns it for trimming", () => {
    const result = match("/coins/bitcoin?vs_currency=EUR&tickers=true");
    expect(result).toEqual({
      ok: true,
      route: {
        upstreamPath:
          "/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false",
        ttlSeconds: 600,
        currency: "eur",
      },
    });
  });

  it("gives longer chart ranges a longer cache lifetime", () => {
    const ttl = (days: string) => {
      const result = match(`/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`);
      return result.ok ? result.route.ttlSeconds : null;
    };
    expect(ttl("1")).toBeLessThan(ttl("30")!);
    expect(ttl("30")).toBeLessThan(ttl("365")!);
  });

  it("trims and lowercases search queries", () => {
    expect(upstreamPath("/search?query=%20BTC%20")).toBe("/search?query=btc");
  });

  it.each([
    "/",
    "/simple/price?ids=bitcoin",
    "/coins/list",
    "/coins/list?vs_currency=usd",
    "/coins/categories?vs_currency=usd",
    "/coins/markets/market_chart?vs_currency=usd&days=1",
    "/coins/bitcoin/tickers",
    "/coins/../../key",
    "/coins/..%2F..%2Fkey/market_chart",
    "/coins/Bitcoin?vs_currency=usd",
    "/search/trending",
  ])("rejects routes outside the allow-list: %s", (path) => {
    expect(match(path)).toMatchObject({ ok: false, error: { status: 404, code: "not_found" } });
  });

  it.each([
    "/coins/markets",
    "/coins/markets?vs_currency=btc",
    "/coins/markets?vs_currency=usd&per_page=11",
    "/coins/markets?vs_currency=usd&page=0",
    "/coins/markets?vs_currency=usd&page=101",
    "/coins/markets?vs_currency=usd&page=1.5",
    "/coins/bitcoin",
    "/coins/bitcoin/market_chart?vs_currency=usd&days=2",
    "/coins/bitcoin/market_chart?vs_currency=usd&days=max",
    "/search?query=b",
    `/search?query=${"a".repeat(51)}`,
  ])("rejects invalid params: %s", (path) => {
    expect(match(path)).toMatchObject({ ok: false, error: { status: 400, code: "invalid_param" } });
  });
});
