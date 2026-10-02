import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCryptocurrencyPriceHistory } from "@/api/coingecko";
import { getErrorMessage } from "@/api/coingecko-errors";
import type { HistoryDays, PriceHistoryPoint } from "@/api/coingecko.types";
import type { CurrencyCode } from "@/constants/currencies";

export function usePriceHistory(
  id: string,
  currency: CurrencyCode,
  days: HistoryDays,
) {
  const { data, error, isPending, isPlaceholderData, refetch } = useQuery({
    queryKey: ["price-history", id, currency, days],
    // Return the range with the points so a placeholder chart can say which
    // range it is still showing while the selected one loads.
    queryFn: async ({ signal }): Promise<{
      days: HistoryDays;
      points: PriceHistoryPoint[];
    }> => ({
      days,
      points: await getCryptocurrencyPriceHistory(id, currency, days, signal),
    }),
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
