import { authenticate } from "./auth";
import { errorResponse, HttpError, preflightResponse } from "./http";
import { matchRoute } from "./routes";

// Watchlist API. Contract: docs/watchlist-api.md.

// Retry-After for clients over a limit. The binding doesn't say when its
// window resets, so wait the longest period it supports (10 or 60 s).
const RATE_LIMITED_RETRY_AFTER_SECONDS = 60;

async function checkLimit(limiter: RateLimit, key: string): Promise<void> {
  const { success } = await limiter.limit({ key });
  if (!success) {
    throw new HttpError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", {
      "Retry-After": String(RATE_LIMITED_RETRY_AFTER_SECONDS),
    });
  }
}

async function handle(request: Request, env: Env): Promise<Response> {
  const { route, params } = matchRoute(request.method, new URL(request.url).pathname);

  // Creating a user is the only route without a token, so it is limited per
  // IP, and tightly: a person needs one user, a household a few.
  if (!route.auth) {
    await checkLimit(env.USER_CREATION_LIMITER, request.headers.get("CF-Connecting-IP") ?? "unknown");
    return route.handler({ request, env, params });
  }

  // Everything else is limited per user, so many users behind one carrier IP
  // don't share a limit. That needs the user first, so auth comes before it.
  const user = await authenticate(request, env.DB);
  await checkLimit(env.USER_LIMITER, user.id);
  return route.handler({ request, env, params, user });
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === "OPTIONS") return preflightResponse();

    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      // Logged for us; the client never sees internals.
      console.error("Unhandled error", error);
      return errorResponse(new HttpError(500, "internal", "Something went wrong."));
    }
  },
} satisfies ExportedHandler<Env>;
