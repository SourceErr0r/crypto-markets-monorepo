import { useQuery } from "@tanstack/react-query";

import { getCryptocurrencyDetails } from "@/api/coingecko";
import { getErrorMessage } from "@/api/coingecko-errors";
import type { CurrencyCode } from "@/constants/currencies";

// Keyed by currency because the API returns market data in one currency.
export function useCryptocurrencyDetails(id: string, currency: CurrencyCode) {
  const { data, error, refetch } = useQuery({
    queryKey: ["cryptocurrency", id, currency],
    queryFn: ({ signal }) => getCryptocurrencyDetails(id, currency, signal),
  });

  return {
    data,
    error: error ? getErrorMessage(error) : null,
    retry: () => void refetch(),
  };
}
