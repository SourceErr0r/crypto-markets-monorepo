import { useQuery } from "@tanstack/react-query";

import { getTopCryptocurrencies } from "@/api/coingecko";
import { getErrorMessage } from "@/api/coingecko-errors";
import type { CurrencyCode } from "@/constants/currencies";

export function useCryptocurrencies(currency: CurrencyCode) {
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["cryptocurrencies", currency],
    queryFn: ({ signal }) => getTopCryptocurrencies(currency, signal),
  });

  return {
    cryptocurrencies: data ?? [],
    error: error ? getErrorMessage(error) : null,
    isLoading: isPending,
    isRefreshing: isRefetching,
    refresh: () => void refetch(),
  };
}
