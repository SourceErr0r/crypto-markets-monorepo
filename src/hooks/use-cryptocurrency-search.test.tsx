import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  searchCryptocurrencies,
  type CryptocurrencySearchResult,
} from "@/api/coingecko";
import { CoinGeckoError } from "@/api/coingecko-errors";
import { useCryptocurrencySearch } from "@/hooks/use-cryptocurrency-search";
import { createQueryWrapper } from "@/test/query-wrapper";

jest.mock("@/api/coingecko");
const search = jest.mocked(searchCryptocurrencies);

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as CryptocurrencySearchResult;

describe("useCryptocurrencySearch", () => {
  beforeEach(() => {
    search.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("does not search for an empty query", () => {
    const { result } = renderHook(() => useCryptocurrencySearch("  "), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current).toMatchObject({ hasTerm: false, isLoading: false });
    act(() => jest.advanceTimersByTime(1000));
    expect(search).not.toHaveBeenCalled();
  });

  it("waits for typing to pause, then returns the results", async () => {
    search.mockResolvedValue([bitcoin]);
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useCryptocurrencySearch(query),
      { wrapper: createQueryWrapper(), initialProps: { query: "" } },
    );
    rerender({ query: "b" });
    rerender({ query: "bit" });

    expect(result.current.isLoading).toBe(true);
    expect(search).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.results).toEqual([bitcoin]));
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("bit", expect.any(AbortSignal));
    expect(result.current.isLoading).toBe(false);
  });

  it("reports errors", async () => {
    search.mockRejectedValue(new CoinGeckoError("Rate limited"));
    const { result } = renderHook(() => useCryptocurrencySearch("btc"), {
      wrapper: createQueryWrapper(),
    });

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.error).toBe("Rate limited"));
    expect(result.current.isLoading).toBe(false);
  });
});
