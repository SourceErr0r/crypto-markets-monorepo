import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "../errors";
import { useCryptocurrencies } from "./use-cryptocurrencies";
import { createApiClient, type ApiClient } from "../client";
import { createWrapper } from "./test-wrapper";
import type { Cryptocurrency } from "../types";

const getTop = vi.fn<ApiClient["getTopCryptocurrencies"]>();
const api = { ...createApiClient("https://api.test"), getTopCryptocurrencies: getTop };

const bitcoin = {
  id: "bitcoin",
  name: "Bitcoin",
  last_updated: "2026-11-18T12:00:00.000Z",
} as Cryptocurrency;

describe("useCryptocurrencies", () => {
  beforeEach(() => {
    getTop.mockReset();
  });

  it("is loading until the market data arrives", async () => {
    getTop.mockResolvedValue([bitcoin]);
    const { result } = renderHook(() => useCryptocurrencies("gbp"), {
      wrapper: createWrapper(api),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.cryptocurrencies).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cryptocurrencies).toEqual([bitcoin]);
    expect(getTop).toHaveBeenCalledWith("gbp", expect.any(AbortSignal));
  });

  it("exposes request errors and recovers when refreshed", async () => {
    getTop.mockRejectedValueOnce(new ApiError("Too many requests", { kind: "http", status: 429 }));
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() => expect(result.current.error?.message).toBe("Too many requests"));
    expect(result.current.isLoading).toBe(false);

    getTop.mockResolvedValue([bitcoin]);
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.cryptocurrencies).toEqual([bitcoin]));
    expect(result.current.error).toBeNull();
  });

  it("dates the data by when CoinGecko last updated it, not when we fetched it", async () => {
    getTop.mockResolvedValue([
      bitcoin,
      { ...bitcoin, id: "ethereum", last_updated: "2026-11-18T12:00:30.000Z" },
      { ...bitcoin, id: "unknown", last_updated: null },
    ]);
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.updatedAt).toBe(Date.parse("2026-11-18T12:00:30.000Z"));
  });

  it("keeps showing cached data when a refresh fails, and says when it failed", async () => {
    getTop.mockResolvedValueOnce([bitcoin]);
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createWrapper(api),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.errorUpdatedAt).toBe(0);

    getTop.mockRejectedValueOnce(new ApiError("offline", { kind: "network" }));
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.error?.kind).toBe("offline"));
    expect(result.current.cryptocurrencies).toEqual([bitcoin]);
    expect(result.current.updatedAt).toBe(Date.parse("2026-11-18T12:00:00.000Z"));
    expect(result.current.errorUpdatedAt).toBeGreaterThan(0);
  });

  it("reuses fresh data instead of calling the API again", async () => {
    getTop.mockResolvedValue([bitcoin]);
    const wrapper = createWrapper(api);
    const first = renderHook(() => useCryptocurrencies("gbp"), { wrapper });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    first.unmount();

    // Leaving the screen and coming back within the stale time.
    const second = renderHook(() => useCryptocurrencies("gbp"), { wrapper });

    expect(second.result.current.cryptocurrencies).toEqual([bitcoin]);
    expect(getTop).toHaveBeenCalledTimes(1);
  });

  it("loads data again when the currency changes", async () => {
    getTop.mockResolvedValue([bitcoin]);
    const { result, rerender } = renderHook(
      ({ currency }: { currency: "gbp" | "eur" }) => useCryptocurrencies(currency),
      { wrapper: createWrapper(api), initialProps: { currency: "gbp" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ currency: "eur" });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.cryptocurrencies).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getTop).toHaveBeenCalledWith("eur", expect.any(AbortSignal));
  });
});
