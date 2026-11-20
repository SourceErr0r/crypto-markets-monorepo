import type { z } from "zod";

import type { CurrencyCode } from "./currencies";
import {
  type ApiErrorResponse,
  ApiError,
  httpErrorMessage,
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  parseRetryAfter,
  TIMEOUT_MESSAGE,
} from "./errors";
import {
  cryptocurrencyDetailsSchema,
  marketsSchema,
  priceHistorySchema,
  searchResponseSchema,
} from "./schemas";
import type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
  HistoryDays,
  PriceHistoryPoint,
} from "./types";

// The proxy rejects shorter queries: they match almost everything and would
// each cost an uncached upstream call.
export const MIN_SEARCH_LENGTH = 2;

// Without a limit, a hung connection spins until the user leaves the screen.
// 10 s is generous for a cached proxy response on a slow mobile network.
const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiClient = ReturnType<typeof createApiClient>;

// Aborts when the caller cancels or when `timeoutMs` passes, whichever comes
// first, and remembers which one it was. Written by hand rather than with
// AbortSignal.any/timeout, which not every JS engine (e.g. Hermes) provides.
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();

  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    },
  };
}

// `baseUrl` is the API proxy (apps/proxy), which holds the CoinGecko key. Each
// app passes its own, so this package has no platform or env-var code.
export function createApiClient(
  baseUrl: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
) {
  // The time limit covers the whole exchange, body included: a response can
  // stall halfway through as easily as before it starts.
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const timeout = withTimeout(signal, timeoutMs);
    try {
      return await send(path, schema, timeout.signal);
    } catch (error) {
      if (timeout.timedOut()) {
        throw new ApiError(TIMEOUT_MESSAGE, { kind: "timeout", cause: error });
      }
      throw error;
    } finally {
      timeout.cleanup();
    }
  }

  // Every response is checked against a schema, so callers get typed data or
  // an ApiError, never an unchecked cast.
  async function send<T>(
    path: string,
    schema: z.ZodType<T>,
    signal: AbortSignal,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { signal });
    } catch (error) {
      // Cancelled or timed-out requests are handled by `request`. Anything
      // else means no response.
      if (signal.aborted) throw error;
      throw new ApiError(NETWORK_ERROR_MESSAGE, {
        kind: "network",
        cause: error,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as ApiErrorResponse | null;
      const code = body?.error?.code;
      throw new ApiError(httpErrorMessage(response.status), {
        kind: "http",
        status: response.status,
        code,
        retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")),
      });
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new ApiError(INVALID_RESPONSE_MESSAGE, {
        kind: "invalid-response",
        cause: error,
      });
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ApiError(INVALID_RESPONSE_MESSAGE, {
        kind: "invalid-response",
        cause: result.error,
      });
    }
    return result.data;
  }

  // One page of coins ranked by market cap. `page` is 1-based. The proxy
  // allows per_page 10, 50, 100 or 250 and pages 1-100.
  async function getMarkets(
    currency: CurrencyCode,
    { page, perPage }: { page: number; perPage: number },
    signal?: AbortSignal,
  ): Promise<Cryptocurrency[]> {
    const params = new URLSearchParams({
      vs_currency: currency,
      order: "market_cap_desc",
      per_page: String(perPage),
      page: String(page),
    });

    return request(`/coins/markets?${params.toString()}`, marketsSchema, signal);
  }

  async function getTopCryptocurrencies(
    currency: CurrencyCode,
    signal?: AbortSignal,
  ): Promise<Cryptocurrency[]> {
    return getMarkets(currency, { page: 1, perPage: 10 }, signal);
  }

  // The proxy sets CoinGecko's detail flags itself and returns market data in
  // `currency` only.
  async function getCryptocurrencyDetails(
    coinId: string,
    currency: CurrencyCode,
    signal?: AbortSignal,
  ): Promise<CryptocurrencyDetails> {
    const params = new URLSearchParams({ vs_currency: currency });
    return request(
      `/coins/${encodeURIComponent(coinId)}?${params.toString()}`,
      cryptocurrencyDetailsSchema,
      signal,
    );
  }

  async function getCryptocurrencyPriceHistory(
    coinId: string,
    currency: CurrencyCode,
    days: HistoryDays,
    signal?: AbortSignal,
  ): Promise<PriceHistoryPoint[]> {
    const params = new URLSearchParams({
      vs_currency: currency,
      days: String(days),
    });
    return request(
      `/coins/${encodeURIComponent(coinId)}/market_chart?${params.toString()}`,
      priceHistorySchema,
      signal,
    );
  }

  async function searchCryptocurrencies(
    query: string,
    signal?: AbortSignal,
  ): Promise<CryptocurrencySearchResult[]> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      return [];
    }

    const params = new URLSearchParams({ query: trimmedQuery });
    return request(
      `/search?${params.toString()}`,
      searchResponseSchema,
      signal,
    );
  }

  return {
    getMarkets,
    getTopCryptocurrencies,
    getCryptocurrencyDetails,
    getCryptocurrencyPriceHistory,
    searchCryptocurrencies,
  };
}
