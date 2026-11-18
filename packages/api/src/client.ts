import { Platform } from "react-native";

import {
  type ApiErrorResponse,
  CoinGeckoError,
  httpErrorMessage,
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from "@/api/coingecko-errors";
import {
  parseCryptocurrencies,
  parseCryptocurrencyDetails,
  parsePriceHistory,
  parseSearchResults,
} from "@/api/coingecko-parsers";
import type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
  HistoryDays,
  PriceHistoryPoint,
} from "@/api/coingecko.types";
import type { CurrencyCode } from "@/constants/currencies";

export type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
} from "@/api/coingecko.types";

// The app talks to our API proxy (apps/proxy), which holds the CoinGecko key.
// Not a secret: EXPO_PUBLIC_* values are inlined into the bundle.
// Without it, use `wrangler dev` on this machine. The Android emulator reaches
// the host at 10.0.2.2, not localhost, so iOS and Android can run side by side.
const LOCAL_PROXY_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_PROXY_URL;

// The proxy rejects shorter queries: they match almost everything and would
// each cost an uncached upstream call.
export const MIN_SEARCH_LENGTH = 2;

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { signal });
  } catch (error) {
    // Cancelled requests are not failures. Anything else means no response.
    if (signal?.aborted) throw error;
    throw new CoinGeckoError(NETWORK_ERROR_MESSAGE, { cause: error });
  }

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    const code = body?.error?.code;
    throw new CoinGeckoError(httpErrorMessage(response.status), {
      status: response.status,
      code,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new CoinGeckoError(INVALID_RESPONSE_MESSAGE, { cause: error });
  }
}

export async function getTopCryptocurrencies(
  currency: CurrencyCode,
  signal?: AbortSignal,
): Promise<Cryptocurrency[]> {
  const params = new URLSearchParams({
    vs_currency: currency,
    order: "market_cap_desc",
    per_page: "10",
    page: "1",
  });

  const response = await request<unknown>(
    `/coins/markets?${params.toString()}`,
    signal,
  );
  return parseCryptocurrencies(response);
}

// The proxy sets CoinGecko's detail flags itself and returns market data in
// `currency` only.
export async function getCryptocurrencyDetails(
  coinId: string,
  currency: CurrencyCode,
  signal?: AbortSignal,
): Promise<CryptocurrencyDetails> {
  const params = new URLSearchParams({ vs_currency: currency });
  const response = await request<unknown>(
    `/coins/${encodeURIComponent(coinId)}?${params.toString()}`,
    signal,
  );
  return parseCryptocurrencyDetails(response);
}

export async function getCryptocurrencyPriceHistory(
  coinId: string,
  currency: CurrencyCode,
  days: HistoryDays,
  signal?: AbortSignal,
): Promise<PriceHistoryPoint[]> {
  const params = new URLSearchParams({
    vs_currency: currency,
    days: String(days),
  });
  const response = await request<unknown>(
    `/coins/${encodeURIComponent(coinId)}/market_chart?${params.toString()}`,
    signal,
  );
  return parsePriceHistory(response);
}

export async function searchCryptocurrencies(
  query: string,
  signal?: AbortSignal,
): Promise<CryptocurrencySearchResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
    return [];
  }

  const params = new URLSearchParams({ query: trimmedQuery });
  const response = await request<unknown>(`/search?${params.toString()}`, signal);
  return parseSearchResults(response);
}
