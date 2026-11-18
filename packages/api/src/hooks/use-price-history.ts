import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useApiClient } from "../client-context";
import { getErrorMessage } from "../errors";
import type { HistoryDays, PriceHistoryPoint } from "../types";
import type { CurrencyCode } from "../currencies";

const MINUTE_MS = 60 * 1000;
// Follows the data's granularity, like the proxy's cache: CoinGecko returns
// 5-minute points for 1 day and hourly points for 7 and 30 days.
const STALE_TIME_MS: Record<HistoryDays, number> = {
  1: 5 * MINUTE_MS,
  7: 30 * MINUTE_MS,
  30: 30 * MINUTE_MS,
};

export function usePriceHistory(
  id: string,
  currency: CurrencyCode,
  days: HistoryDays,
) {
  const api = useApiClient();
  const { data, error, isPending, isPlaceholderData, refetch } = useQuery({
    queryKey: ["price-history", id, currency, days],
    // Return the range with the points so a placeholder chart can say which
    // range it is still showing while the selected one loads.
    queryFn: async ({ signal }): Promise<{
      days: HistoryDays;
      points: PriceHistoryPoint[];
    }> => ({
      days,
      points: await api.getCryptocurrencyPriceHistory(id, currency, days, signal),
    }),
    staleTime: STALE_TIME_MS[days],
    placeholderData: keepPreviousData,
  });

  const hasChart = data !== undefined && data.points.length >= 2;

  return {
    history: hasChart ? data : null,
    error: error ? getErrorMessage(error) : null,
    isLoading: isPending || isPlaceholderData,
    isEmpty: data !== undefined && !isPlaceholderData && !hasChart,
    retry: () => void refetch(),
  };
}
