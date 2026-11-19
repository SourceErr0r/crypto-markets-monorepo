import { delay, http, HttpResponse, type JsonBodyType } from "msw";
import { describe, expect, it } from "vitest";

import { createApiClient } from "./client";
import {
  ApiError,
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_MESSAGE,
} from "./errors";
import {
  coinDetailsFixture,
  marketsFixture,
  proxyError,
  TEST_BASE_URL,
} from "./testing";
import { server } from "./testing/server";

const api = createApiClient(TEST_BASE_URL);

// Replaces the handler for `path` and records the requests that reach it.
function respondWith(path: string, response: () => Response) {
  const requests: Request[] = [];
  server.use(
    http.get(`${TEST_BASE_URL}${path}`, ({ request }) => {
      requests.push(request);
      return response();
    }),
  );
  return requests;
}

const respondWithJson = (path: string, body: JsonBodyType) =>
  respondWith(path, () => HttpResponse.json(body));

describe("getTopCryptocurrencies", () => {
  it("requests the top ten coins in the selected currency", async () => {
    const requests = respondWithJson("/coins/markets", marketsFixture);

    const coins = await api.getTopCryptocurrencies("gbp");

    const params = new URL(requests[0].url).searchParams;
    expect(params.get("vs_currency")).toBe("gbp");
    expect(params.get("order")).toBe("market_cap_desc");
    expect(params.get("per_page")).toBe("10");
    expect(params.get("page")).toBe("1");
    expect(coins.map((coin) => coin.id)).toEqual(["bitcoin", "ethereum"]);
  });

  it("keeps only the fields the app uses", async () => {
    const [bitcoin] = await api.getTopCryptocurrencies("usd");

    expect(bitcoin).toEqual({
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://example.com/bitcoin.png",
      market_cap_rank: 1,
      current_price: 65000,
      total_volume: 30000000000,
      market_cap: 1280000000000,
    });
  });

  it("keeps missing or invalid numbers as null instead of inventing values", async () => {
    respondWithJson("/coins/markets", [
      { id: "x", symbol: "x", name: "X", current_price: "oops" },
    ]);

    await expect(api.getTopCryptocurrencies("gbp")).resolves.toEqual([
      {
        id: "x",
        symbol: "x",
        name: "X",
        image: "",
        market_cap_rank: null,
        current_price: null,
        total_volume: null,
        market_cap: null,
      },
    ]);
  });

  it.each([
    { status: { error_code: 1 } },
    null,
    [null],
    [{ id: "bitcoin", name: "Bitcoin" }],
  ])("rejects malformed market data: %j", async (body) => {
    respondWithJson("/coins/markets", body);

    await expect(api.getTopCryptocurrencies("gbp")).rejects.toMatchObject({
      message: INVALID_RESPONSE_MESSAGE,
      kind: "invalid-response",
    });
  });
});

describe("getCryptocurrencyDetails", () => {
  it("requests one currency and sends no credentials", async () => {
    const requests = respondWithJson("/coins/:id", coinDetailsFixture("eur"));

    const details = await api.getCryptocurrencyDetails("bitcoin", "eur");

    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/coins/bitcoin");
    expect(url.searchParams.get("vs_currency")).toBe("eur");
    // The key lives in the proxy; the app sends no credentials at all.
    expect(requests[0].headers.has("authorization")).toBe(false);
    expect([...requests[0].headers.keys()]).not.toContainEqual(
      expect.stringMatching(/cg|key/i),
    );
    expect(details.market_data.current_price).toEqual({ eur: 65000 });
  });

  it("encodes the coin id into a single path segment", async () => {
    const requests = respondWithJson("/coins/:id/market_chart", { prices: [] });

    await api.getCryptocurrencyPriceHistory("coin/id", "gbp", 7);

    expect(new URL(requests[0].url).pathname).toBe(
      "/coins/coin%2Fid/market_chart",
    );
  });

  it("falls back for missing display fields without inventing data", async () => {
    respondWithJson("/coins/:id", {
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "btc",
      market_data: {
        current_price: { gbp: 0, usd: "invalid" },
        max_supply: null,
      },
    });

    const details = await api.getCryptocurrencyDetails("bitcoin", "gbp");

    expect(details.market_data.current_price).toEqual({ gbp: 0, usd: null });
    expect(details.market_data.max_supply).toBeNull();
    expect(details.market_data.ath).toEqual({});
    expect(details.description.en).toBe("");
    expect(details.links).toEqual({ homepage: [], whitepaper: null });
  });

  it.each([
    null,
    {},
    { id: "bitcoin", name: "Bitcoin", symbol: "btc" },
    { id: "", name: "Bitcoin", symbol: "btc", market_data: {} },
  ])("rejects malformed detail data: %j", async (body) => {
    respondWithJson("/coins/:id", body);

    await expect(
      api.getCryptocurrencyDetails("bitcoin", "gbp"),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("reports an unknown coin as not found", async () => {
    await expect(
      api.getCryptocurrencyDetails("not-a-coin", "usd"),
    ).rejects.toMatchObject({
      message: "We couldn't find that cryptocurrency.",
      kind: "http",
      status: 404,
      code: "not_found",
    });
  });
});

describe("getCryptocurrencyPriceHistory", () => {
  it("requests the selected currency and range", async () => {
    const requests = respondWithJson("/coins/:id/market_chart", { prices: [] });

    await api.getCryptocurrencyPriceHistory("bitcoin", "eur", 30);

    const params = new URL(requests[0].url).searchParams;
    expect(params.get("vs_currency")).toBe("eur");
    expect(params.get("days")).toBe("30");
  });

  it("sorts points by time and collapses duplicate timestamps", async () => {
    respondWithJson("/coins/:id/market_chart", {
      prices: [
        [2000, 12],
        [1000, 10],
        [2000, 13],
      ],
    });

    await expect(
      api.getCryptocurrencyPriceHistory("bitcoin", "gbp", 1),
    ).resolves.toEqual([
      [1000, 10],
      [2000, 13],
    ]);
  });

  it("allows empty history so the screen can show an empty state", async () => {
    respondWithJson("/coins/:id/market_chart", { prices: [] });

    await expect(
      api.getCryptocurrencyPriceHistory("bitcoin", "gbp", 7),
    ).resolves.toEqual([]);
  });

  it.each([
    {},
    { prices: null },
    { prices: [[1000, null]] },
    { prices: [[1000, "12"]] },
    { prices: [[1000, -1]] },
    { prices: [[1000, 10, 5]] },
  ])("rejects malformed history: %j", async (body) => {
    respondWithJson("/coins/:id/market_chart", body);

    await expect(
      api.getCryptocurrencyPriceHistory("bitcoin", "gbp", 1),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });
});

describe("searchCryptocurrencies", () => {
  it.each(["   ", " b "])(
    "does not call the API for a query under two characters: %j",
    async (query) => {
      const requests = respondWithJson("/search", { coins: [] });

      await expect(api.searchCryptocurrencies(query)).resolves.toEqual([]);
      expect(requests).toHaveLength(0);
    },
  );

  it("sends the trimmed query, encoded, and keeps only the fields the app uses", async () => {
    const requests = respondWithJson("/search", {
      coins: [
        {
          id: "bitcoin",
          name: "Bitcoin",
          symbol: "BTC",
          api_symbol: "bitcoin",
          market_cap_rank: 1,
          thumb: "thumb.png",
        },
        { id: "obscure", name: "Obscure", symbol: "OBS", market_cap_rank: null },
      ],
    });

    const results = await api.searchCryptocurrencies(" bit & coin ");

    expect(new URL(requests[0].url).searchParams.get("query")).toBe(
      "bit & coin",
    );
    expect(results).toEqual([
      {
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "BTC",
        market_cap_rank: 1,
        thumb: "thumb.png",
      },
      {
        id: "obscure",
        name: "Obscure",
        symbol: "OBS",
        market_cap_rank: null,
        thumb: "",
      },
    ]);
  });

  it("rejects responses without a coins list", async () => {
    respondWithJson("/search", {});

    await expect(api.searchCryptocurrencies("btc")).rejects.toMatchObject({
      message: INVALID_RESPONSE_MESSAGE,
      kind: "invalid-response",
    });
  });
});

// Failure handling is shared by every endpoint, so it's tested through one.
describe("failures", () => {
  it.each([
    [429, "rate_limited", "Too many requests"],
    [503, "upstream_busy", "busy right now"],
    [502, "upstream_unavailable", "temporarily unavailable"],
    [400, "invalid_param", "wasn't valid"],
  ])(
    "maps HTTP %i (%s) to a friendly message and keeps the details",
    async (status, code, message) => {
      respondWith("/coins/markets", () => proxyError(status, code));

      const error = await api.getTopCryptocurrencies("usd").catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ kind: "http", status, code });
      expect(error.message).toContain(message);
      // The proxy's own message is for developers, not users.
      expect(error.message).not.toContain("Test error");
    },
  );

  it("keeps the proxy's Retry-After so callers know how long to wait", async () => {
    respondWith("/coins/markets", () =>
      proxyError(429, "rate_limited", { retryAfterSeconds: 60 }),
    );

    await expect(api.getTopCryptocurrencies("usd")).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 60,
    });
  });

  it("handles error responses that are not JSON", async () => {
    respondWith(
      "/coins/markets",
      () => new HttpResponse("<html>Bad gateway</html>", { status: 502 }),
    );

    await expect(api.getTopCryptocurrencies("usd")).rejects.toMatchObject({
      kind: "http",
      status: 502,
      code: undefined,
    });
  });

  it("reports network failures", async () => {
    respondWith("/coins/markets", () => HttpResponse.error());

    await expect(api.getTopCryptocurrencies("usd")).rejects.toMatchObject({
      message: NETWORK_ERROR_MESSAGE,
      kind: "network",
    });
  });

  it("reports a successful response with an unreadable body", async () => {
    respondWith(
      "/coins/markets",
      () =>
        new HttpResponse("{ truncated", {
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(api.getTopCryptocurrencies("usd")).rejects.toMatchObject({
      message: INVALID_RESPONSE_MESSAGE,
      kind: "invalid-response",
    });
  });

  it("gives up on a response that takes too long", async () => {
    const quickApi = createApiClient(TEST_BASE_URL, { timeoutMs: 20 });
    server.use(
      http.get(`${TEST_BASE_URL}/coins/markets`, async () => {
        await delay("infinite");
        return HttpResponse.json(marketsFixture);
      }),
    );

    await expect(quickApi.getTopCryptocurrencies("usd")).rejects.toMatchObject({
      message: TIMEOUT_MESSAGE,
      kind: "timeout",
    });
  });

  it("does not time out a response that arrives in time", async () => {
    const quickApi = createApiClient(TEST_BASE_URL, { timeoutMs: 200 });
    server.use(
      http.get(`${TEST_BASE_URL}/coins/markets`, async () => {
        await delay(10);
        return HttpResponse.json(marketsFixture);
      }),
    );

    await expect(quickApi.getTopCryptocurrencies("usd")).resolves.toHaveLength(2);
  });

  it("lets cancelled requests through unchanged, not as failures", async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await api
      .getTopCryptocurrencies("usd", controller.signal)
      .catch((e) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.name).toBe("AbortError");
  });
});
