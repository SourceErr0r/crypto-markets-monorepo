import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "../client-context";
import { toDisplayError } from "../errors";
import type { CurrencyCode } from "../currencies";
import { newestUpdate } from "./updated-at";

// Prices move constantly, so check again after a couple of minutes. A refetch
// is cheap: the proxy serves it from its 15-minute cache, not from CoinGecko.
const STALE_TIME_MS = 2 * 60 * 1000;

export function useCryptocurrencies(currency: CurrencyCode) {
  const api = useApiClient();
  const {
    data,
    error,
    errorUpdatedAt,
    isPending,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["cryptocurrencies", currency],
    queryFn: ({ signal }) => api.getTopCryptocurrencies(currency, signal),
    staleTime: STALE_TIME_MS,
  });

  return {
    cryptocurrencies: data ?? [],
    error: error ? toDisplayError(error) : null,
    // When the prices on screen were last fresh at CoinGecko, for "Updated
    // 14:05". Not when we fetched them: that may have come from a cache.
    updatedAt: data ? newestUpdate(data.map((coin) => coin.last_updated)) : null,
    // Changes on every failed fetch, so a screen can react to each failure
    // once (e.g. show a toast) even when the message is the same.
    errorUpdatedAt,
    isLoading: isPending,
    isRefreshing: isRefetching,
    refresh: () => void refetch(),
  };
}
