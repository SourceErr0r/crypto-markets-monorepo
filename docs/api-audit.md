# API layer audit

Before extending the take-home into a fuller product, I reviewed its API layer as a code reviewer would. The goal was to decide what to keep, what to fix, and in what order, before moving any code.

**Scope:** `src/api/` (client, errors, parsers, types), `src/hooks/` (four TanStack Query hooks), `src/app/_layout.tsx` (QueryClient defaults), `.gitignore`, and the git history, checked for any committed key.

**Context:** the brief asked for direct calls to CoinGecko and no backend, and the app was built to run locally rather than ship. Some findings below were deliberate trade-offs within that brief (see [DECISIONS.md](DECISIONS.md)). They are listed because they must change before the app ships.

## What's already good

- **Cancellation:** abort signals go from TanStack Query through to `fetch`, and a cancelled request is re-thrown as-is rather than reported as a network error.
- **One error type:** `CoinGeckoError` holds a message that's safe to show users, plus the raw status and code for debugging. `getErrorMessage` is the only path errors take to the UI.
- **Error mapping:** CoinGecko's body `error_code` takes precedence over the HTTP status, which gives more specific messages.
- **Validation at the boundary:** responses are parsed from `unknown`, not cast. Missing optional fields default safely, and missing required fields fail with a clear error.
- **Retry policy:** only failures that could be transient are retried (network, 408, 5xx).
- **Search:** debounced at 400 ms, and an empty query never makes a request.
- **Secrets hygiene:** env files are gitignored, and no key has ever been committed.

## Findings

High = must fix before release. Medium = noticeable quality or cost issue. Low = polish or a future feature.

| # | Priority | Finding | Planned fix | Phase |
|---|----------|---------|-------------|-------|
| 1 | High | **API key in the client bundle (intentional for the take-home).** Expo inlines `EXPO_PUBLIC_*` variables into the JS bundle, so the key can be extracted from any build. `.gitignore` only keeps it out of git. The brief excluded a backend, and the key is a free, revocable Demo key, so this was acceptable for a local demo but not for a release. | A proxy holds the key as a server secret. The app no longer has a key. | API proxy (**done**) |
| 2 | High | **No backoff, and 429 is ignored.** Rate-limit responses fail immediately, and `Retry-After` is not honoured. Other retryable errors get one immediate retry with no delay. | Exponential backoff with jitter. On a 429, wait for `Retry-After` (capped) instead of failing. | Retries & pagination |
| 3 | High | **All users share one rate-limit budget.** Every install uses the same key, and the search debounce is the only throttling. | Per-IP rate limiting (429 + `Retry-After`) and edge caching at the proxy, so many users share one upstream call. | API proxy (**done**) |
| 4 | Medium | **One cache lifetime for everything.** A global 5-minute `staleTime` covers prices, charts, coin descriptions and search alike. | A stale time per query, based on how fast each kind of data changes. | Shared API package (**done**: from 2 minutes for prices to an hour for search) |
| 5 | Medium | **Over-fetching.** Coin detail returns market data in every currency when the screen shows one. | The proxy returns only what the screen needs. | API proxy (**done**: coin detail is trimmed to one currency, about 31 KB to 6 KB) |
| 6 | Medium | **Hand-written parsers.** They're correct, but types and runtime checks are maintained separately and can drift apart. That suited four endpoints; it won't suit a growing API. | zod schemas, with types inferred from them. | Shared API package (**done**) |
| 7 | Medium | **Retry scope too wide.** Errors that aren't HTTP errors, such as a parser bug, are treated as retryable. The request helper's generic return type is an unchecked cast. | Retry only network errors and transient statuses. The request helper returns `unknown`. | Shared API package (**done**: errors carry a kind, and the request helper parses against a schema instead of casting) |
| 8 | Medium | **No request timeout.** A hung connection lasts until the user leaves the screen. | A timeout signal combined with the query's abort signal. | Retries & pagination |
| 9 | Low | **Error copy tied to the upstream.** The messages mention CoinGecko and "check your key", which will be wrong once the key lives on the server. | Neutral copy, and mapping for the proxy's own errors. | API proxy (**done**) |
| 10 | Low | **No pagination.** Top 10 is fixed, which is correct for the core screen. | A separate "All markets" screen with infinite scroll, handling duplicates and gaps when rankings shift between pages. | Retries & pagination |
| 11 | Low | **Hooks flatten errors to strings.** Screens can't tell "not found" from "rate limited" from "offline". | Hooks return an error kind alongside the message. | Retries & pagination |
| 12 | Low | **Per-file `fetch` mocks.** There are no shared fixtures across tests. | MSW handlers and fixtures shared across apps. | Shared API package (**done**) |

## Order of work

1. **Monorepo split:** move the code to its final location first, while moving files is still cheap.
2. **CI:** lint, typecheck and tests on every PR, so every later change is checked.
3. **API proxy:** a Cloudflare Worker that holds the key, allows only the endpoints the app uses, rate-limits per IP and caches at the edge (#1, #3, #5, #9).
4. **Shared API package:** client, zod schemas, query hooks and MSW fixtures, used by both mobile and web (#4, #6, #7, #12).
5. **Retries & pagination:** backoff, honouring `Retry-After`, timeouts and an "All markets" screen (#2, #8, #10, #11).
