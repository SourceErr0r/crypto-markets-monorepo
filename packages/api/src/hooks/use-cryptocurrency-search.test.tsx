import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "../errors";
import { useCryptocurrencySearch } from "./use-cryptocurrency-search";
import { createApiClient, type ApiClient } from "../client";
import { createWrapper } from "./test-wrapper";
import type { CryptocurrencySearchResult } from "../types";

const search = vi.fn<ApiClient["searchCryptocurrencies"]>();
const api = { ...createApiClient("https://api.test"), searchCryptocurrencies: search };

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as CryptocurrencySearchResult;

describe("useCryptocurrencySearch", () => {
  beforeEach(() => {
    search.mockReset();
    // Testing Library's waitFor only knows how to advance Jest's fake timers,
    // so let Vitest's fake clock also follow real time while it polls.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it.each(["  ", "b"])("does not search for a query under two characters: %p", (query) => {
    const { result } = renderHook(() => useCryptocurrencySearch(query), {
      wrapper: createWrapper(api),
    });

    expect(result.current).toMatchObject({ hasTerm: false, isLoading: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(search).not.toHaveBeenCalled();
  });

  it("waits for typing to pause, then returns the results", async () => {
    search.mockResolvedValue([bitcoin]);
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useCryptocurrencySearch(query),
      { wrapper: createWrapper(api), initialProps: { query: "" } },
    );
    rerender({ query: "b" });
    rerender({ query: "bit" });

    expect(result.current.isLoading).toBe(true);
    expect(search).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.results).toEqual([bitcoin]));
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("bit", expect.any(AbortSignal));
    expect(result.current.isLoading).toBe(false);
  });

  it("reports errors", async () => {
    search.mockRejectedValue(new ApiError("Rate limited", { kind: "http", status: 429 }));
    const { result } = renderHook(() => useCryptocurrencySearch("btc"), {
      wrapper: createWrapper(api),
    });

    act(() => vi.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.error).toBe("Rate limited"));
    expect(result.current.isLoading).toBe(false);
  });
});
