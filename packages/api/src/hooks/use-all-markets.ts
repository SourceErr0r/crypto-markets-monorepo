import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { useApiClient } from "../client-context";
import type { CurrencyCode } from "../currencies";
import { toDisplayError } from "../errors";
import type { Cryptocurrency } from "../types";
import { newestUpdate } from "./updated-at";

// 100 coins a page, 5 pages: the top 500. Smaller pages show the first screen
// sooner; the cap stops a long scroll from spending the upstream budget on
// coins few people look for (search covers those). Each page is its own proxy
// cache entry per currency, fetched only when someone scrolls that far.
export const ALL_MARKETS_PAGE_SIZE = 100;
export const ALL_MARKETS_MAX_PAGES = 5;

// Same as the top 10: prices move, and the proxy absorbs the refetches.
const STALE_TIME_MS = 2 * 60 * 1000;

// Pages are offsets into a ranking that moves between fetches. A coin that
// drops a place after page 1 loads shows up again at the top of page 2, so
// keep its first (higher-ranked) appearance. A coin that climbs across the
// boundary is skipped instead; a refresh brings it back.
function uniqueCoins(data: InfiniteData<Cryptocurrency[], number>) {
  const seen = new Set<string>();
  return data.pages.flat().filter((coin) => {
    if (seen.has(coin.id)) return false;
    seen.add(coin.id);
    return true;
  });
}

export function useAllMarkets(currency: CurrencyCode) {
  const api = useApiClient();
  const {
    data,
    error,
    errorUpdatedAt,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["markets", "all", currency],
    queryFn: ({ pageParam, signal }) =>
      api.getMarkets(
        currency,
        { page: pageParam, perPage: ALL_MARKETS_PAGE_SIZE },
        signal,
      ),
    initialPageParam: 1,
    // A short page means CoinGecko has no more coins; otherwise stop at the cap.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < ALL_MARKETS_PAGE_SIZE ||
      lastPageParam >= ALL_MARKETS_MAX_PAGES
        ? undefined
        : lastPageParam + 1,
    // Module-level function, so TanStack only reruns it when the pages change.
    select: uniqueCoins,
    staleTime: STALE_TIME_MS,
  });

  const displayError = error ? toDisplayError(error) : null;

  return {
    cryptocurrencies: data ?? [],
    // Failed first load or refresh. A failed next page is `loadMoreError`
    // instead, so the screen can show it at the end of the list.
    error: isFetchNextPageError ? null : displayError,
    loadMoreError: isFetchNextPageError ? displayError : null,
    updatedAt: data ? newestUpdate(data.map((coin) => coin.last_updated)) : null,
    errorUpdatedAt,
    hasMore: hasNextPage,
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    // Pull-to-refresh refetches every page loaded so far, in order, so the
    // list and scroll position stay put. Cheap: each page is cached at the
    // proxy.
    isRefreshing: isRefetching && !isFetchingNextPage,
    refresh: () => void refetch(),
    // Fetching the next page during a refresh would race it, so wait.
    loadMore: () => {
      if (hasNextPage && !isFetching) void fetchNextPage();
    },
  };
}
