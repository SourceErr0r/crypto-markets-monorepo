import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "../client-context";
import { getErrorMessage } from "../errors";
import type { CurrencyCode } from "../currencies";

// Prices move constantly, so check again after a couple of minutes. A refetch
// is cheap: the proxy serves it from its 15-minute cache, not from CoinGecko.
const STALE_TIME_MS = 2 * 60 * 1000;

export function useCryptocurrencies(currency: CurrencyCode) {
  const api = useApiClient();
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["cryptocurrencies", currency],
    queryFn: ({ signal }) => api.getTopCryptocurrencies(currency, signal),
    staleTime: STALE_TIME_MS,
  });

  return {
    cryptocurrencies: data ?? [],
    error: error ? getErrorMessage(error) : null,
    isLoading: isPending,
    isRefreshing: isRefetching,
    refresh: () => void refetch(),
  };
}
