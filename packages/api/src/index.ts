// Shared API layer: typed client for the API proxy and TanStack Query hooks.
export { createApiClient, MIN_SEARCH_LENGTH, type ApiClient } from "./client";
export { ApiClientProvider, useApiClient } from "./client-context";
export { CURRENCY_CODES, type CurrencyCode } from "./currencies";
export {
  ApiError,
  getErrorMessage,
  isRetryable,
  type ApiErrorKind,
} from "./errors";
export { retryDelay, shouldRetry } from "./retry";
export type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
  HistoryDays,
  PriceHistoryPoint,
} from "./types";
export { useCryptocurrencies } from "./hooks/use-cryptocurrencies";
export { useCryptocurrencyDetails } from "./hooks/use-cryptocurrency-details";
export { useCryptocurrencySearch } from "./hooks/use-cryptocurrency-search";
export { usePriceHistory } from "./hooks/use-price-history";
