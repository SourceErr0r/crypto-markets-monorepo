import type { z } from "zod";

import type { CurrencyCode } from "./currencies";
import {
  type ApiErrorResponse,
  ApiError,
  httpErrorMessage,
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
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

export type ApiClient = ReturnType<typeof createApiClient>;

// `baseUrl` is the API proxy (apps/proxy), which holds the CoinGecko key. Each
// app passes its own, so this package has no platform or env-var code.
export function createApiClient(baseUrl: string) {
  // Every response is checked against a schema, so callers get typed data or
  // an ApiError, never an unchecked cast.
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { signal });
    } catch (error) {
      // Cancelled requests are not failures. Anything else means no response.
      if (signal?.aborted) throw error;
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

  async function getTopCryptocurrencies(
    currency: CurrencyCode,
    signal?: AbortSignal,
  ): Promise<Cryptocurrency[]> {
    const params = new URLSearchParams({
      vs_currency: currency,
      order: "market_cap_desc",
      per_page: "10",
      page: "1",
    });

    return request(`/coins/markets?${params.toString()}`, marketsSchema, signal);
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
    getTopCryptocurrencies,
    getCryptocurrencyDetails,
    getCryptocurrencyPriceHistory,
    searchCryptocurrencies,
  };
}
