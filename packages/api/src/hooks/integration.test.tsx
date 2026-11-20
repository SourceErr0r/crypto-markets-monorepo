import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../client";
import { retryDelay, shouldRetry } from "../retry";
import { marketsFixture, proxyError, TEST_BASE_URL } from "../testing";
import { server } from "../testing/server";
import { createWrapper } from "./test-wrapper";
import { ALL_MARKETS_PAGE_SIZE, useAllMarkets } from "./use-all-markets";
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
      expect(result.current.error?.message).toMatch(/too many requests/i),
    );
    expect(result.current.error).toMatchObject({
      kind: "rate-limited",
      retryAfterSeconds: 30,
    });
    expect(result.current.cryptocurrencies).toEqual([]);
  });

  it("reports an unknown coin", async () => {
    const { result } = renderHook(
      () => useCryptocurrencyDetails("not-a-coin", "gbp"),
      { wrapper: createWrapper(api) },
    );

    await waitFor(() =>
      expect(result.current.error?.message).toBe("We couldn't find that cryptocurrency."),
    );
  });
});

describe("retry policy against the proxy's rate limits", () => {
  const withPolicy = () =>
    createWrapper(api, { retry: shouldRetry, retryDelay });

  // Counts calls to the markets endpoint, answering each with the next response.
  function respondInTurn(...responses: (() => Response)[]) {
    let calls = 0;
    server.use(
      http.get(`${TEST_BASE_URL}/coins/markets`, () => {
        const respond = responses[Math.min(calls, responses.length - 1)];
        calls += 1;
        return respond();
      }),
    );
    return () => calls;
  }

  it("shows a long Retry-After straight away instead of retrying", async () => {
    const calls = respondInTurn(() =>
      proxyError(429, "rate_limited", { retryAfterSeconds: 60 }),
    );
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: withPolicy(),
    });

    // TanStack only sets `error` once it has stopped retrying, so seeing it
    // here (well inside 60 s) means no retry was scheduled.
    await waitFor(() => expect(result.current.error?.kind).toBe("rate-limited"));
    expect(result.current.error?.retryAfterSeconds).toBe(60);
    expect(calls()).toBe(1);
  });

  it("waits out a short Retry-After and then succeeds", async () => {
    // 0 s keeps the test fast; the policy treats it like any short wait.
    const calls = respondInTurn(
      () => proxyError(503, "upstream_busy", { retryAfterSeconds: 0 }),
      () => HttpResponse.json(marketsFixture),
    );
    const { result } = renderHook(() => useCryptocurrencies("usd"), {
      wrapper: withPolicy(),
    });

    await waitFor(() => expect(result.current.cryptocurrencies).toHaveLength(2));
    expect(result.current.error).toBeNull();
    expect(calls()).toBe(2);
  });
});

describe("All markets pagination against the proxy", () => {
  // A full page of valid coins, so the hook asks for another.
  const fullPage = Array.from({ length: ALL_MARKETS_PAGE_SIZE }, (_, i) => ({
    ...marketsFixture[0],
    id: `coin-${i}`,
  }));

  it("keeps page 1 when page 2 is rate-limited, and says when to retry", async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/coins/markets`, ({ request }) =>
        new URL(request.url).searchParams.get("page") === "1"
          ? HttpResponse.json(fullPage)
          : proxyError(429, "rate_limited", { retryAfterSeconds: 60 }),
      ),
    );
    const { result } = renderHook(() => useAllMarkets("usd"), {
      wrapper: createWrapper(api, { retry: shouldRetry, retryDelay }),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.loadMoreError).toMatchObject({
        kind: "rate-limited",
        retryAfterSeconds: 60,
      }),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.cryptocurrencies).toHaveLength(ALL_MARKETS_PAGE_SIZE);
  });
});
