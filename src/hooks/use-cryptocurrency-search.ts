import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchCryptocurrencies } from "@/api/coingecko";
import { getErrorMessage } from "@/api/coingecko-errors";

// CoinGecko's free tier is rate limited, so wait for typing to pause.
const DEBOUNCE_MS = 400;

export function useCryptocurrencySearch(query: string) {
  const term = query.trim();
  const [debouncedTerm, setDebouncedTerm] = useState(term);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [term]);

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["cryptocurrency-search", debouncedTerm],
    queryFn: ({ signal }) => searchCryptocurrencies(debouncedTerm, signal),
    enabled: debouncedTerm !== "",
  });

  const hasTerm = term !== "";
  // Covers both the debounce wait and any in-flight request, including retries.
  const isLoading = hasTerm && (term !== debouncedTerm || isFetching);
  return {
    hasTerm,
    results: hasTerm ? (data ?? []) : [],
    // Hide a stale error while a new search or retry is under way.
    error: hasTerm && !isLoading && error ? getErrorMessage(error) : null,
    isLoading,
    retry: () => void refetch(),
  };
}
