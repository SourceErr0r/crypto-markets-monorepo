// Response helpers shared by the handler. Every response, success or error,
// carries the same CORS headers.

// The data is public, so any origin may read it. CORS only controls which
// web pages can read responses in a browser; it is not access control.
// Expose-Headers lets browser clients read headers that aren't CORS-safelisted.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Age, Retry-After, X-Cache",
};

export type ErrorCode =
  | "invalid_param"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited" // this client sent too many requests
  | "upstream_busy" // CoinGecko rate-limited the proxy
  | "upstream_unavailable"; // CoinGecko failed or returned something unusable

export type ApiError = {
  status: number;
  code: ErrorCode;
  message: string;
  retryAfterSeconds?: number;
};

// Error body format: { "error": { "code": "...", "message": "..." } }.
// `code` is stable for clients to branch on; `message` is for humans.
export function errorResponse({ status, code, message, retryAfterSeconds }: ApiError): Response {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (retryAfterSeconds !== undefined) headers["Retry-After"] = String(retryAfterSeconds);
  return Response.json({ error: { code, message } }, { status, headers });
}

export type CacheStatus = "HIT" | "MISS" | "STALE";

export function dataResponse(
  body: string,
  { ageSeconds, cacheStatus }: { ageSeconds: number; cacheStatus: CacheStatus },
): Response {
  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      // Clients may store a copy but must ask us before reusing it. With
      // max-age, the device's HTTP cache answered refreshes itself, so
      // pull-to-refresh did nothing and failures never surfaced. Asking us is
      // cheap: we answer from KV without calling CoinGecko.
      "Cache-Control": "no-cache",
      // How old the data is, so the app can show "updated 4 min ago".
      Age: String(ageSeconds),
      // For debugging and tests: was this served from the cache?
      "X-Cache": cacheStatus,
    },
  });
}
