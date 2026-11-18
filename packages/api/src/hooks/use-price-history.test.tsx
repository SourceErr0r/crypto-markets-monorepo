import { act, renderHook, waitFor } from "@testing-library/react-native";

import { CoinGeckoError } from "@/api/coingecko-errors";
import { getCryptocurrencyPriceHistory } from "@/api/coingecko";
import type { HistoryDays, PriceHistoryPoint } from "@/api/coingecko.types";
import { usePriceHistory } from "@/hooks/use-price-history";
import { createQueryWrapper } from "@/test/query-wrapper";

jest.mock("@/api/coingecko");
const getHistory = jest.mocked(getCryptocurrencyPriceHistory);

const points: PriceHistoryPoint[] = [
  [1000, 10],
  [2000, 12],
];

function renderHistory() {
  return renderHook(
    ({ days }: { days: HistoryDays }) => usePriceHistory("bitcoin", "gbp", days),
    { wrapper: createQueryWrapper(), initialProps: { days: 7 } },
  );
}

describe("usePriceHistory", () => {
  beforeEach(() => getHistory.mockReset());

  it("returns the chart for the selected range", async () => {
    getHistory.mockResolvedValue(points);
    const { result } = renderHistory();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.history).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual({ days: 7, points });
    expect(getHistory).toHaveBeenCalledWith("bitcoin", "gbp", 7, expect.any(AbortSignal));
  });

  it("keeps showing the previous range while the next one loads", async () => {
    getHistory.mockResolvedValueOnce(points);
    const { result, rerender } = renderHistory();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Leave the 30 day request pending so the in-between state can be observed.
    let resolveThirtyDays: (value: PriceHistoryPoint[]) => void = () => {};
    getHistory.mockReturnValueOnce(
      new Promise((resolve) => (resolveThirtyDays = resolve)),
    );
    rerender({ days: 30 });

    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.history?.days).toBe(7);

    const longer: PriceHistoryPoint[] = [...points, [3000, 15]];
    await act(async () => resolveThirtyDays(longer));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual({ days: 30, points: longer });
  });

  it("reuses cached data when returning to a range", async () => {
    getHistory.mockResolvedValue(points);
    const { result, rerender } = renderHistory();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ days: 30 });
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ days: 7 });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.history?.days).toBe(7);
  });

  it("reports an empty range instead of a chart when there are too few points", async () => {
    getHistory.mockResolvedValue([[1000, 10]]);
    const { result } = renderHistory();

    await waitFor(() => expect(result.current.isEmpty).toBe(true));
    expect(result.current.history).toBeNull();
  });

  it("reports the error message and recovers on retry", async () => {
    getHistory.mockRejectedValueOnce(new CoinGeckoError("Rate limited"));
    const { result } = renderHistory();

    await waitFor(() => expect(result.current.error).toBe("Rate limited"));
    expect(result.current.isLoading).toBe(false);

    getHistory.mockResolvedValue(points);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.history).toEqual({ days: 7, points }));
    expect(result.current.error).toBeNull();
  });
});
