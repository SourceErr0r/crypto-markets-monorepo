import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "../client-context";
import { toDisplayError } from "../errors";
import type { CurrencyCode } from "../currencies";

// Mostly slow-moving facts (description, supply, all-time high) plus the
// current price. Half the proxy's 10-minute cache.
const STALE_TIME_MS = 5 * 60 * 1000;

// Keyed by currency because the API returns market data in one currency.
export function useCryptocurrencyDetails(id: string, currency: CurrencyCode) {
  const api = useApiClient();
  const { data, dataUpdatedAt, error, errorUpdatedAt, refetch } = useQuery({
    queryKey: ["cryptocurrency", id, currency],
    queryFn: ({ signal }) => api.getCryptocurrencyDetails(id, currency, signal),
    staleTime: STALE_TIME_MS,
  });

  return {
    data,
    error: error ? toDisplayError(error) : null,
    updatedAt: data ? dataUpdatedAt : null,
    errorUpdatedAt,
    retry: () => void refetch(),
  };
}
