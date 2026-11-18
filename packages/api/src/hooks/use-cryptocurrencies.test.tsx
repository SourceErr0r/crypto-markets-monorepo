import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "../errors";
import { useCryptocurrencies } from "./use-cryptocurrencies";
import { createApiClient, type ApiClient } from "../client";
import { createWrapper } from "./test-wrapper";
import type { Cryptocurrency } from "../types";

const getTop = vi.fn<ApiClient["getTopCryptocurrencies"]>();
const api = { ...createApiClient("https://api.test"), getTopCryptocurrencies: getTop };

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as Cryptocurrency;

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

    await waitFor(() => expect(result.current.error).toBe("Too many requests"));
    expect(result.current.isLoading).toBe(false);

    getTop.mockResolvedValue([bitcoin]);
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.cryptocurrencies).toEqual([bitcoin]));
    expect(result.current.error).toBeNull();
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
