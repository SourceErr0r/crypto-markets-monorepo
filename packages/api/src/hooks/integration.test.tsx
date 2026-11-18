import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../client";
import { proxyError, TEST_BASE_URL } from "../testing";
import { server } from "../testing/server";
import { createWrapper } from "./test-wrapper";
import { useCryptocurrencies } from "./use-cryptocurrencies";
import { useCryptocurrencyDetails } from "./use-cryptocurrency-details";

// The other hook tests stub the client to focus on hook logic. These run the
// real client against the mock proxy to check the pieces fit together.
const api = createApiClient(TEST_BASE_URL);

describe("hooks with the real client", () => {
  it("loads the top coins from the proxy", async () => {
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.cryptocurrencies.map((coin) => coin.id)).toEqual([
      "bitcoin",
      "ethereum",
    ]);
  });

  it("shows the friendly message for a proxy error", async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/coins/markets`, () =>
        proxyError(429, "rate_limited", { retryAfterSeconds: 30 }),
      ),
    );
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() =>
      expect(result.current.error).toMatch(/too many requests/i),
    );
    expect(result.current.cryptocurrencies).toEqual([]);
  });

  it("reports an unknown coin", async () => {
    const { result } = renderHook(
      () => useCryptocurrencyDetails("not-a-coin", "gbp"),
      { wrapper: createWrapper(api) },
    );

    await waitFor(() =>
      expect(result.current.error).toBe("We couldn't find that cryptocurrency."),
    );
  });
});
