import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient, type ApiClient } from "../client";
import { ApiError } from "../errors";
import type { Cryptocurrency } from "../types";
import { createWrapper } from "./test-wrapper";
import {
  ALL_MARKETS_MAX_PAGES,
  ALL_MARKETS_PAGE_SIZE,
  useAllMarkets,
} from "./use-all-markets";

const getMarkets = vi.fn<ApiClient["getMarkets"]>();
const api = { ...createApiClient("https://api.test"), getMarkets };

const coin = (id: string) =>
  ({ id, name: id, last_updated: "2026-11-19T12:00:00.000Z" }) as Cryptocurrency;

// A full page of distinct coins: "p1-0" … "p1-99".
const fullPage = (page: number) =>
  Array.from({ length: ALL_MARKETS_PAGE_SIZE }, (_, i) => coin(`p${page}-${i}`));

function renderAllMarkets() {
  return renderHook(() => useAllMarkets("gbp"), { wrapper: createWrapper(api) });
}

describe("useAllMarkets", () => {
  beforeEach(() => {
    getMarkets.mockReset();
  });

  it("loads the first page, then the next one on request", async () => {
    getMarkets.mockImplementation(async (_currency, { page }) => fullPage(page));
    const { result } = renderAllMarkets();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cryptocurrencies).toHaveLength(ALL_MARKETS_PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);
    expect(getMarkets).toHaveBeenCalledWith(
      "gbp",
      { page: 1, perPage: ALL_MARKETS_PAGE_SIZE },
      expect.any(AbortSignal),
    );

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.cryptocurrencies).toHaveLength(2 * ALL_MARKETS_PAGE_SIZE),
    );
    expect(result.current.cryptocurrencies[ALL_MARKETS_PAGE_SIZE].id).toBe("p2-0");
  });

  it("drops a coin that slid onto the next page between fetches", async () => {
    const page1 = fullPage(1);
    // The ranking moved: page 1's last coin is now first on page 2.
    const page2 = [page1[ALL_MARKETS_PAGE_SIZE - 1], ...fullPage(2).slice(1)];
    getMarkets.mockImplementation(async (_currency, { page }) =>
      page === 1 ? page1 : page2,
    );
    const { result } = renderAllMarkets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    const ids = result.current.cryptocurrencies.map((c) => c.id);
    expect(ids).toHaveLength(2 * ALL_MARKETS_PAGE_SIZE - 1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ends the list on a short page", async () => {
    getMarkets.mockResolvedValue([coin("bitcoin"), coin("ethereum")]);
    const { result } = renderAllMarkets();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.loadMore());
    expect(getMarkets).toHaveBeenCalledTimes(1);
  });

  it("stops at the page cap even if more coins exist", async () => {
    getMarkets.mockImplementation(async (_currency, { page }) => fullPage(page));
    const { result } = renderAllMarkets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (let page = 2; page <= ALL_MARKETS_MAX_PAGES; page += 1) {
      act(() => result.current.loadMore());
      await waitFor(() =>
        expect(result.current.cryptocurrencies).toHaveLength(page * ALL_MARKETS_PAGE_SIZE),
      );
    }

    expect(result.current.hasMore).toBe(false);
    expect(getMarkets).toHaveBeenCalledTimes(ALL_MARKETS_MAX_PAGES);
  });

  it("keeps loaded pages when the next one fails, and reports it separately", async () => {
    getMarkets.mockResolvedValueOnce(fullPage(1));
    const { result } = renderAllMarkets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    getMarkets.mockRejectedValueOnce(new ApiError("offline", { kind: "network" }));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadMoreError?.kind).toBe("offline"));
    expect(result.current.error).toBeNull();
    expect(result.current.cryptocurrencies).toHaveLength(ALL_MARKETS_PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);

    // Retrying the same page clears the error.
    getMarkets.mockResolvedValueOnce(fullPage(2));
    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.cryptocurrencies).toHaveLength(2 * ALL_MARKETS_PAGE_SIZE),
    );
    expect(result.current.loadMoreError).toBeNull();
  });

  it("reports a failed refresh as `error` and keeps the data", async () => {
    getMarkets.mockResolvedValueOnce(fullPage(1));
    const { result } = renderAllMarkets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    getMarkets.mockRejectedValueOnce(new ApiError("offline", { kind: "network" }));
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.error?.kind).toBe("offline"));
    expect(result.current.loadMoreError).toBeNull();
    expect(result.current.cryptocurrencies).toHaveLength(ALL_MARKETS_PAGE_SIZE);
    expect(result.current.errorUpdatedAt).toBeGreaterThan(0);
  });
});
