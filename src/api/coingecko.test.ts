import {
  CoinGeckoError,
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from "@/api/coingecko-errors";
import {
  getCryptocurrencyDetails,
  getCryptocurrencyPriceHistory,
  getTopCryptocurrencies,
} from "@/api/coingecko";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as typeof fetch;
});

describe("coin details and history", () => {
  it("requests history in the selected currency and range, and forwards cancellation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        prices: [
          [2000, 12],
          [1000, 10],
          [2000, 13],
        ],
      }),
    });
    const controller = new AbortController();
    await expect(
      getCryptocurrencyPriceHistory("coin/id", "eur", 30, controller.signal),
    ).resolves.toEqual([
      [1000, 10],
      [2000, 13],
    ]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/coins/coin%2Fid/market_chart?");
    expect(new URL(url).searchParams.get("vs_currency")).toBe("eur");
    expect(new URL(url).searchParams.get("days")).toBe("30");
    expect(options.signal).toBe(controller.signal);
  });

  it("preserves missing statistics and zero values without inventing data", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "btc",
        market_data: {
          current_price: { gbp: 0, usd: "invalid" },
          max_supply: null,
        },
      }),
    });
    const details = await getCryptocurrencyDetails("bitcoin");
    expect(details.market_data.current_price).toEqual({ gbp: 0, usd: null });
    expect(details.market_data.max_supply).toBeNull();
    expect(details.market_data.ath).toEqual({});
    expect(details.description.en).toBe("");
    expect(details.links.homepage).toEqual([]);
  });

  it.each([null, {}, { id: "bitcoin", name: "Bitcoin", symbol: "btc" }])(
    "rejects malformed detail data: %p",
    async (data) => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => data });
      await expect(getCryptocurrencyDetails("bitcoin")).rejects.toThrow(
        INVALID_RESPONSE_MESSAGE,
      );
    },
  );

  it.each([
    {},
    { prices: null },
    { prices: [[1000, null]] },
    { prices: [[1000, "12"]] },
    { prices: [[1000, -1]] },
  ])("rejects malformed history: %p", async (data) => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });
    await expect(
      getCryptocurrencyPriceHistory("bitcoin", "gbp", 1),
    ).rejects.toThrow(INVALID_RESPONSE_MESSAGE);
  });

  it("allows empty history so the screen can show an empty state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ prices: [] }),
    });
    await expect(
      getCryptocurrencyPriceHistory("bitcoin", "gbp", 7),
    ).resolves.toEqual([]);
  });

  it("shows a friendly message for history rate limits", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ status: { error_message: "Rate limit exceeded" } }),
    });
    await expect(
      getCryptocurrencyPriceHistory("bitcoin", "gbp", 7),
    ).rejects.toThrow("Too many requests");
  });
});

const bitcoinMarket = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://example.com/bitcoin.png",
  market_cap_rank: 1,
  current_price: 50000,
  total_volume: 1000,
  market_cap: 2000,
};

describe("getTopCryptocurrencies", () => {
  it("keeps missing or invalid numbers as null instead of inventing values", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "x", symbol: "x", name: "X", current_price: "oops" },
      ],
    });

    await expect(getTopCryptocurrencies("gbp")).resolves.toEqual([
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
  ])("rejects malformed market data: %p", async (data) => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });

    await expect(getTopCryptocurrencies("gbp")).rejects.toThrow(
      INVALID_RESPONSE_MESSAGE,
    );
  });

  it("requests the top ten coins in the selected currency", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([bitcoinMarket]),
    });

    await expect(getTopCryptocurrencies("gbp")).resolves.toEqual([
      bitcoinMarket,
    ]);

    const [url] = fetchMock.mock.calls[0] as [string];
    const searchParams = new URL(url).searchParams;

    expect(url).toContain("/coins/markets");
    expect(searchParams.get("vs_currency")).toBe("gbp");
    expect(searchParams.get("order")).toBe("market_cap_desc");
    expect(searchParams.get("per_page")).toBe("10");
    expect(searchParams.get("page")).toBe("1");
  });

  it("maps CoinGecko errors to friendly messages without exposing raw ones", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn().mockResolvedValue({
        status: { error_code: 429, error_message: "Rate limit exceeded" },
      }),
    });

    const error = await getTopCryptocurrencies("usd").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CoinGeckoError);
    expect(error).toMatchObject({
      message: expect.stringContaining("Too many requests"),
      status: 429,
      code: 429,
    });
    expect((error as Error).message).not.toContain("Rate limit exceeded");
  });

  it("prefers CoinGecko error codes over the HTTP status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ status: { error_code: 10005 } }),
    });

    await expect(getTopCryptocurrencies("usd")).rejects.toThrow(
      "isn't available with the current CoinGecko plan",
    );
  });

  it("handles error responses that are not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });

    await expect(getTopCryptocurrencies("usd")).rejects.toThrow(
      "temporarily unavailable",
    );
  });

  it("reports network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(getTopCryptocurrencies("usd")).rejects.toThrow(
      NETWORK_ERROR_MESSAGE,
    );
  });

  it("reports a successful response with an unreadable body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });

    await expect(getTopCryptocurrencies("usd")).rejects.toThrow(
      INVALID_RESPONSE_MESSAGE,
    );
  });

  it("lets cancelled requests through unchanged", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw abortError;
    });

    await expect(
      getTopCryptocurrencies("usd", controller.signal),
    ).rejects.toBe(abortError);
  });
});
