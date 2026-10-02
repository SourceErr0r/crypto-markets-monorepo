import { act, renderHook, waitFor } from "@testing-library/react-native";

import { CoinGeckoError } from "@/api/coingecko-errors";
import { getTopCryptocurrencies, type Cryptocurrency } from "@/api/coingecko";
import { useCryptocurrencies } from "@/hooks/use-cryptocurrencies";
import { createQueryWrapper } from "@/test/query-wrapper";

jest.mock("@/api/coingecko");
const getTop = jest.mocked(getTopCryptocurrencies);

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as Cryptocurrency;

describe("useCryptocurrencies", () => {
  beforeEach(() => getTop.mockReset());

  it("is loading until the market data arrives", async () => {
    getTop.mockResolvedValue([bitcoin]);
    const { result } = renderHook(() => useCryptocurrencies("gbp"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.cryptocurrencies).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cryptocurrencies).toEqual([bitcoin]);
    expect(getTop).toHaveBeenCalledWith("gbp", expect.any(AbortSignal));
  });

  it("exposes request errors and recovers when refreshed", async () => {
    getTop.mockRejectedValueOnce(new CoinGeckoError("Too many requests"));
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe("Too many requests"));
    expect(result.current.isLoading).toBe(false);

    getTop.mockResolvedValue([bitcoin]);
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.cryptocurrencies).toEqual([bitcoin]));
    expect(result.current.error).toBeNull();
  });

  it("loads data again when the currency changes", async () => {
    getTop.mockResolvedValue([bitcoin]);
    const { result, rerender } = renderHook(
      ({ currency }: { currency: "gbp" | "eur" }) => useCryptocurrencies(currency),
      { wrapper: createQueryWrapper(), initialProps: { currency: "gbp" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ currency: "eur" });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.cryptocurrencies).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getTop).toHaveBeenCalledWith("eur", expect.any(AbortSignal));
  });
});
