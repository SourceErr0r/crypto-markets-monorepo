import { readCache, writeCache } from "./cache";
import { dataResponse, errorResponse } from "./http";
import { matchRoute } from "./routes";
import { trimToCurrency } from "./trim";
import { fetchUpstream } from "./upstream";

// Must match `ratelimits[0].simple.period` in wrangler.jsonc. The binding
// doesn't say when the window resets, so a full period is the safe wait.
const RATE_LIMIT_PERIOD_SECONDS = 60;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== "GET") {
      return errorResponse({ status: 405, code: "method_not_allowed", message: "Only GET is supported." });
    }

    // Per-IP limit, checked first so even rejected requests count. Many mobile
    // users can share one IP (carrier NAT), so the limit is set generously.
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return errorResponse({
        status: 429,
        code: "rate_limited",
        message: "Too many requests. Please wait a moment and try again.",
        retryAfterSeconds: RATE_LIMIT_PERIOD_SECONDS,
      });
    }

    const match = matchRoute(new URL(request.url));
    if (!match.ok) return errorResponse(match.error);
    const { upstreamPath, ttlSeconds, currency } = match.route;

    // Coin detail is cached in every currency and trimmed on the way out.
    const shape = (body: string) => (currency ? trimToCurrency(body, currency) : body);

    const cached = await readCache(env.CACHE, upstreamPath);
    if (cached && cached.ageSeconds < ttlSeconds) {
      return dataResponse(shape(cached.body), { ageSeconds: cached.ageSeconds, ttlSeconds, cacheStatus: "HIT" });
    }

    const upstream = await fetchUpstream(upstreamPath, env.COINGECKO_API_KEY);
    if (upstream.ok) {
      // Written after the response is sent, so the client doesn't wait on KV.
      ctx.waitUntil(writeCache(env.CACHE, upstreamPath, upstream.body));
      return dataResponse(shape(upstream.body), { ageSeconds: 0, ttlSeconds, cacheStatus: "MISS" });
    }

    // Upstream failed: an old copy is better than an error (stale-if-error).
    // A 404 is a real answer, not a failure, so it isn't masked.
    if (cached && upstream.error.status !== 404) {
      return dataResponse(shape(cached.body), { ageSeconds: cached.ageSeconds, ttlSeconds, cacheStatus: "STALE" });
    }

    return errorResponse(upstream.error);
  },
} satisfies ExportedHandler<Env>;
