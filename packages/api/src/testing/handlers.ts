import { http, HttpResponse } from "msw";

import { CURRENCY_CODES, type CurrencyCode } from "../currencies";
import {
  coinDetailsFixture,
  marketsFixture,
  priceHistoryFixture,
  searchFixture,
} from "./fixtures";

// Base URL for tests. Any value works: MSW intercepts fetch before it leaves.
export const TEST_BASE_URL = "https://api.test";

// An error in the proxy's format: { "error": { "code", "message" } }, with
// Retry-After on rate limits. Codes: apps/proxy/src/http.ts
export function proxyError(
  status: number,
  code: string,
  { retryAfterSeconds }: { retryAfterSeconds?: number } = {},
) {
  return HttpResponse.json(
    { error: { code, message: `Test error: ${code}` } },
    {
      status,
      headers:
        retryAfterSeconds === undefined
          ? undefined
          : { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

function currencyParam(request: Request): CurrencyCode {
  const value = new URL(request.url).searchParams.get("vs_currency");
  return CURRENCY_CODES.find((code) => code === value) ?? "usd";
}

// Happy-path handlers for every endpoint the client calls. Override one in a
// test with `server.use(...)` to simulate a failure.
export function createHandlers(baseUrl = TEST_BASE_URL) {
  return [
    http.get(`${baseUrl}/coins/markets`, () =>
      HttpResponse.json(marketsFixture),
    ),
    http.get(`${baseUrl}/coins/:id/market_chart`, () =>
      HttpResponse.json(priceHistoryFixture),
    ),
    http.get(`${baseUrl}/coins/:id`, ({ params, request }) =>
      params.id === "bitcoin"
        ? HttpResponse.json(coinDetailsFixture(currencyParam(request)))
        : proxyError(404, "not_found"),
    ),
    http.get(`${baseUrl}/search`, () => HttpResponse.json(searchFixture)),
  ];
}
