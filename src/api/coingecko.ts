import {
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
  CoinGeckoErrorResponse,
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

const API_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;
const baseUrl = "https://api.coingecko.com/api/v3";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: API_KEY ? { "x-cg-demo-api-key": API_KEY } : undefined,
      signal,
    });
  } catch (error) {
    // Cancelled requests are not failures. Anything else means no response.
    if (signal?.aborted) throw error;
    throw new CoinGeckoError(NETWORK_ERROR_MESSAGE, { cause: error });
  }

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as CoinGeckoErrorResponse | null;
    const code = body?.status?.error_code;
    throw new CoinGeckoError(httpErrorMessage(response.status, code), {
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

export async function getCryptocurrencyDetails(
  coinId: string,
  signal?: AbortSignal,
): Promise<CryptocurrencyDetails> {
  const response = await request<unknown>(
    `/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`,
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

  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({ query: trimmedQuery });
  const response = await request<unknown>(`/search?${params.toString()}`, signal);
  return parseSearchResults(response);
}
