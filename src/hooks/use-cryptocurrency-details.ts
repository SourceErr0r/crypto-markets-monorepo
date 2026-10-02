import { useQuery } from "@tanstack/react-query";

import { getCryptocurrencyDetails } from "@/api/coingecko";
import { getErrorMessage } from "@/api/coingecko-errors";

export function useCryptocurrencyDetails(id: string) {
  const { data, error, refetch } = useQuery({
    queryKey: ["cryptocurrency", id],
    queryFn: ({ signal }) => getCryptocurrencyDetails(id, signal),
  });

  return {
    data,
    error: error ? getErrorMessage(error) : null,
    retry: () => void refetch(),
  };
}
