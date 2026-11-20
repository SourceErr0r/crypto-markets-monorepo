// Runs the Worker against local KV and rate-limit bindings, with CoinGecko
// replaced by a stub of the global fetch.
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import worker from "./index";

const MARKETS_KEY = "/coins/markets?vs_currency=gbp&order=market_cap_desc&per_page=10&page=1";
const HOUR_MS = 60 * 60 * 1000;

let upstream: MockInstance<typeof fetch>;

// Each test request gets its own IP unless one is given, so the rate limit
// only applies in the test that checks it.
async function get(path: string, options: { method?: string; ip?: string } = {}) {
  const { method = "GET", ip = crypto.randomUUID() } = options;
  // Typed as the request a deployed Worker receives; `cf` data isn't used.
  const request = new Request(`http://proxy.test${path}`, {
    method,
    headers: { "CF-Connecting-IP": ip },
  }) as Request<unknown, IncomingRequestCfProperties>;
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx); // Let the cache write finish.
  return response;
}

function upstreamReturns(body: unknown, init?: ResponseInit) {
  upstream.mockResolvedValue(new Response(JSON.stringify(body), init));
}

async function seedCache(key: string, body: unknown, ageMs: number) {
  await env.CACHE.put(key, JSON.stringify(body), { metadata: { fetchedAt: Date.now() - ageMs } });
}

beforeEach(async () => {
  upstream = vi.spyOn(globalThis, "fetch");
  // Failures are logged on purpose; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});

  const { keys } = await env.CACHE.list();
  await Promise.all(keys.map(({ name }) => env.CACHE.delete(name)));
});

afterEach(() => vi.restoreAllMocks());

describe("requests the proxy refuses", () => {
  it("rejects methods other than GET", async () => {
    const response = await get("/coins/markets?vs_currency=gbp", { method: "POST" });
    expect(response.status).toBe(405);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("returns errors in one JSON format, without calling CoinGecko", async () => {
    const response = await get("/coins/markets?vs_currency=btc");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "invalid_param", message: expect.any(String) },
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("limits each IP to 60 requests a minute", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < 60; i++) {
      expect((await get("/unknown", { ip })).status).toBe(404);
    }

    const limited = await get("/unknown", { ip });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(await limited.json()).toMatchObject({ error: { code: "rate_limited" } });

    // Other clients are unaffected.
    expect((await get("/unknown")).status).toBe(404);
  });
});

describe("caching", () => {
  it("sends the key upstream and serves repeat requests from the cache", async () => {
    upstreamReturns([{ id: "bitcoin" }]);

    const first = await get("/coins/markets?vs_currency=GBP&junk=1");
    expect(first.headers.get("X-Cache")).toBe("MISS");
    expect(await first.json()).toEqual([{ id: "bitcoin" }]);

    // Written differently, but normalised to the same cache key.
    const second = await get("/coins/markets?vs_currency=gbp");
    expect(second.headers.get("X-Cache")).toBe("HIT");
    expect(await second.json()).toEqual([{ id: "bitcoin" }]);

    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, init] = upstream.mock.calls[0]!;
    expect(url).toBe(`https://api.coingecko.com/api/v3${MARKETS_KEY}`);
    expect(new Headers(init?.headers).get("x-cg-demo-api-key")).toBe("test-key");
  });

  it("serves every currency of a coin from one upstream call, trimmed", async () => {
    upstreamReturns({ id: "bitcoin", market_data: { current_price: { gbp: 1, usd: 2 } } });

    const gbp = await get("/coins/bitcoin?vs_currency=gbp");
    const usd = await get("/coins/bitcoin?vs_currency=usd");

    expect(await gbp.json()).toEqual({ id: "bitcoin", market_data: { current_price: { gbp: 1 } } });
    expect(await usd.json()).toEqual({ id: "bitcoin", market_data: { current_price: { usd: 2 } } });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("reports the age of cached data", async () => {
    await seedCache(MARKETS_KEY, [], 2 * 60 * 1000);

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.headers.get("X-Cache")).toBe("HIT");
    expect(Number(response.headers.get("Age"))).toBeGreaterThanOrEqual(120);
    // Clients must come back to us rather than reuse their copy.
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("refreshes an expired entry", async () => {
    await seedCache(MARKETS_KEY, [{ id: "old" }], HOUR_MS);
    upstreamReturns([{ id: "new" }]);

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.headers.get("X-Cache")).toBe("MISS");
    expect(await response.json()).toEqual([{ id: "new" }]);
  });
});

describe("when CoinGecko fails", () => {
  it("serves the expired copy instead of an error", async () => {
    await seedCache(MARKETS_KEY, [{ id: "old" }], HOUR_MS);
    upstreamReturns({}, { status: 500 });

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Cache")).toBe("STALE");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(await response.json()).toEqual([{ id: "old" }]);
  });

  it("hides key problems from the client", async () => {
    upstreamReturns({ status: { error_code: 10002, error_message: "Missing API key" } }, { status: 401 });

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({ error: { code: "upstream_unavailable" } });
    expect(body).not.toMatch(/key/i);
  });

  it("turns CoinGecko's rate limit into a 503 with Retry-After", async () => {
    upstreamReturns({}, { status: 429, headers: { "Retry-After": "30" } });

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toMatchObject({ error: { code: "upstream_busy" } });
  });

  it("returns 502 when the request fails or times out", async () => {
    upstream.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));

    const response = await get("/coins/markets?vs_currency=gbp");
    expect(response.status).toBe(502);
  });

  it("never caches a body that isn't JSON", async () => {
    upstream.mockResolvedValue(new Response("<html>Bad gateway</html>"));

    expect((await get("/coins/markets?vs_currency=gbp")).status).toBe(502);
    expect(await env.CACHE.get(MARKETS_KEY)).toBeNull();
  });

  it("passes a 404 through rather than masking it with a stale copy", async () => {
    const key = "/coins/gone?localization=false&tickers=false&community_data=false&developer_data=false";
    await seedCache(key, { id: "gone", market_data: {} }, HOUR_MS);
    upstreamReturns({ error: "coin not found" }, { status: 404 });

    const response = await get("/coins/gone?vs_currency=gbp");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
