import type { ApiError } from "./http";

const UPSTREAM_BASE_URL = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

export type UpstreamResult = { ok: true; body: string } | { ok: false; error: ApiError };

const unavailable: UpstreamResult = {
  ok: false,
  error: {
    status: 502,
    code: "upstream_unavailable",
    message: "Market data is temporarily unavailable. Please try again shortly.",
  },
};

// Calls CoinGecko and turns every failure into an error the client can act on.
// Upstream statuses are not passed through: a 401 from CoinGecko means the
// proxy's key is wrong, which the client can't fix, so it becomes a 502.
export async function fetchUpstream(path: string, apiKey: string): Promise<UpstreamResult> {
  let response: Response;
  try {
    response = await fetch(UPSTREAM_BASE_URL + path, {
      // Without a key (no .dev.vars locally), CoinGecko's keyless public tier
      // is used, with a lower shared rate limit.
      headers: apiKey ? { "x-cg-demo-api-key": apiKey } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Upstream request failed", path, error);
    return unavailable;
  }

  if (response.ok) {
    const body = await response.text();
    try {
      JSON.parse(body); // Never cache or serve a body the app can't parse.
      return { ok: true, body };
    } catch {
      console.error("Upstream returned invalid JSON", path);
      return unavailable;
    }
  }

  if (response.status === 404) {
    return { ok: false, error: { status: 404, code: "not_found", message: "Not found." } };
  }

  if (response.status === 429) {
    // The proxy's shared quota is exhausted, not this client's. 503 + Retry-After
    // tells the client to back off without blaming it (that's what 429 is for).
    console.warn("Upstream rate limit hit", path);
    const retryAfter = Number(response.headers.get("Retry-After"));
    return {
      ok: false,
      error: {
        status: 503,
        code: "upstream_busy",
        message: "Market data is busy right now. Please try again shortly.",
        retryAfterSeconds: retryAfter > 0 ? retryAfter : DEFAULT_RETRY_AFTER_SECONDS,
      },
    };
  }

  // 401/403 (key or plan problems), 5xx, and any 400 (our request is built from
  // validated values, so a 400 is a proxy bug). Logged for us, generic for the client.
  const detail = await response.text().catch(() => "");
  console.error("Upstream error", response.status, path, detail.slice(0, 500));
  return unavailable;
}
