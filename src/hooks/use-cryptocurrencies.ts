import { useCallback, useEffect, useRef, useState } from "react";

import { getTopCryptocurrencies, type Cryptocurrency } from "@/api/coingecko";

let cachedCryptocurrencies: Cryptocurrency[] | null = null;
let pendingRequest: Promise<Cryptocurrency[]> | null = null;

async function loadCryptocurrencies(
  forceRefresh = false,
): Promise<Cryptocurrency[]> {
  if (!forceRefresh && cachedCryptocurrencies) {
    return cachedCryptocurrencies;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = getTopCryptocurrencies()
    .then((cryptocurrencies) => {
      cachedCryptocurrencies = cryptocurrencies;
      return cryptocurrencies;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function useCryptocurrencies() {
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>(
    () => cachedCryptocurrencies ?? [],
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(
    () => cachedCryptocurrencies === null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(false);

  const fetchCryptocurrencies = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (!cachedCryptocurrencies) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const nextCryptocurrencies = await loadCryptocurrencies(forceRefresh);

      if (isMounted.current) {
        setCryptocurrencies(nextCryptocurrencies);
      }
    } catch (fetchError) {
      if (isMounted.current) {
        setError(
          fetchError instanceof Error
            ? fetchError
            : new Error("Unable to load cryptocurrency data."),
        );
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void fetchCryptocurrencies();

    return () => {
      isMounted.current = false;
    };
  }, [fetchCryptocurrencies]);

  const refresh = useCallback(
    () => fetchCryptocurrencies(true),
    [fetchCryptocurrencies],
  );

  return {
    cryptocurrencies,
    error,
    isLoading,
    isRefreshing,
    refresh,
  };
}
