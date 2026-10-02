import { useCallback, useEffect, useRef, useState } from "react";

import { getTopCryptocurrencies, type Cryptocurrency } from "@/api/coingecko";
import type { CurrencyCode } from "@/constants/currencies";

const cachedCryptocurrencies = new Map<CurrencyCode, Cryptocurrency[]>();
const pendingRequests = new Map<CurrencyCode, Promise<Cryptocurrency[]>>();

async function loadCryptocurrencies(
  currency: CurrencyCode,
  forceRefresh = false,
): Promise<Cryptocurrency[]> {
  const cachedData = cachedCryptocurrencies.get(currency);

  if (!forceRefresh && cachedData) {
    return cachedData;
  }

  const pendingRequest = pendingRequests.get(currency);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = getTopCryptocurrencies(currency)
    .then((cryptocurrencies) => {
      cachedCryptocurrencies.set(currency, cryptocurrencies);
      return cryptocurrencies;
    })
    .finally(() => {
      pendingRequests.delete(currency);
    });

  pendingRequests.set(currency, request);
  return request;
}

export function useCryptocurrencies(currency: CurrencyCode) {
  const initialData = cachedCryptocurrencies.get(currency);
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>(
    () => initialData ?? [],
  );
  const [dataCurrency, setDataCurrency] = useState<CurrencyCode | null>(
    () => (initialData ? currency : null),
  );
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [errorCurrency, setErrorCurrency] = useState<CurrencyCode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let isCurrentCurrency = true;

    void loadCryptocurrencies(currency)
      .then((nextCryptocurrencies) => {
        if (isMounted.current && isCurrentCurrency) {
          setCryptocurrencies(nextCryptocurrencies);
          setDataCurrency(currency);
          setRequestError(null);
          setErrorCurrency(null);
        }
      })
      .catch((fetchError) => {
        if (isMounted.current && isCurrentCurrency) {
          setRequestError(
            fetchError instanceof Error
              ? fetchError
              : new Error("Unable to load cryptocurrency data."),
          );
          setErrorCurrency(currency);
        }
      });

    return () => {
      isCurrentCurrency = false;
    };
  }, [currency]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRequestError(null);
    setErrorCurrency(null);

    try {
      const nextCryptocurrencies = await loadCryptocurrencies(currency, true);

      if (isMounted.current) {
        setCryptocurrencies(nextCryptocurrencies);
        setDataCurrency(currency);
      }
    } catch (fetchError) {
      if (isMounted.current) {
        setRequestError(
          fetchError instanceof Error
            ? fetchError
            : new Error("Unable to load cryptocurrency data."),
        );
        setErrorCurrency(currency);
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [currency]);

  const isCurrentData = dataCurrency === currency;
  const error = errorCurrency === currency ? requestError : null;

  return {
    cryptocurrencies: isCurrentData ? cryptocurrencies : [],
    error,
    isLoading: !isCurrentData && error === null,
    isRefreshing,
    refresh,
  };
}
