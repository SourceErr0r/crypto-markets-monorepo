# Decisions and trade-offs

## Scope

The brief was a small app: top 10 coins by market cap with a detail view, search by name or symbol, loading and error handling, mobile-friendly, calling CoinGecko directly. It was built in roughly six hours over the course of the week.

This document records the decisions in that take-home baseline. The project is now being extended. [api-audit.md](api-audit.md) reviews the baseline and sets out the planned fixes.

## Decisions

### Expo Router with a thin `app/` directory

Files in `src/app/` only re-export a screen from `src/screens/`. Routing stays declarative, and screens, components and hooks are not mixed into route files (Expo Router treats every file under `app/` as a route). The cost is one extra file per route.

Search is a modal presentation and the detail view is a normal stack push. Selecting a search result uses `router.replace`, which replaces the search modal with the details screen on the main stack, allowing the user to return to the dashboard.

### API proxy

The take-home brief asked for direct CoinGecko calls with no backend, so the key lived in an `EXPO_PUBLIC_` variable. Expo inlines those into the bundle, which made the key public. That was acceptable for a local demo, not for a release.

The app now talks only to a Cloudflare Worker (`apps/proxy`), which holds the key as a Worker secret (`.dev.vars` locally) and calls CoinGecko on the app's behalf. The app has no key and sends no credentials.

**Allow-list, not pass-through.** The proxy rebuilds each request rather than forwarding it. Only four routes exist: markets, coin detail, price history and search. Each parameter is checked against a fixed set (currencies, `per_page`, page range, chart ranges of 1, 7, 30, 90 or 365 days, search length 2–50), and the proxy sets the rest itself, such as sort order and coin detail flags. Anything else gets a 404 or 400 without reaching CoinGecko. CoinGecko's own paths that sit where a coin id would (`/coins/list`, `/coins/categories`) are reserved, so they can't be reached as coin ids.

**Caching is a budget decision.** CoinGecko's Demo plan allows 10,000 calls a month, about 14 an hour, so the monthly cap is the real limit. A cache entry refreshed every T minutes costs at most 43,200 / T calls a month however many people use the app, so each route's cache lifetime is chosen with that in mind: markets 15 minutes, coin detail 10, search an hour, charts from 5 minutes (1 day, 5-minute points) to 6 hours (1 year, daily points). Because the request is rebuilt in a fixed form, equivalent requests (`GBP` and `gbp`, extra or reordered params) share one cache entry.

Responses are cached in Workers KV. The Cache API is the usual choice, but it only stores responses on a custom domain, not on a `*.workers.dev` address. KV is eventually consistent and two simultaneous misses both go upstream; at this traffic level that's acceptable, and Durable Objects would be the fix if it weren't. Entries are kept for 24 hours but are only fresh for their route's lifetime, so when CoinGecko fails the proxy serves the last good copy (marked `X-Cache: STALE`) instead of an error. Every response carries an `Age` header so the app can show how old the data is.

**One response per coin, trimmed per currency.** Coin detail comes back with market data in every currency CoinGecko supports, about 60, when the screen shows one. The proxy caches the full response once per coin and returns only the requested currency, so one upstream call serves every currency and the payload drops from about 31 KB to 6 KB.

**Rate limiting.** Each IP gets 60 requests a minute (Workers Rate Limiting binding), with a 429 and `Retry-After` beyond that. The limit is generous because many mobile users can share one IP behind carrier NAT. Counts are kept per Cloudflare location and are approximate, which is fine for abuse control but not for billing.

**Errors.** Every error has one shape, `{ "error": { "code", "message" } }`, with a stable `code` for clients. CoinGecko's statuses are never passed through: a 401 means the proxy's key is wrong, which no client can fix, so it becomes a 502 and is logged. CoinGecko's own 429 becomes a 503 with `Retry-After`, because a 429 would wrongly tell the client that *it* sent too many requests. Upstream calls time out after 10 seconds, and a body that isn't JSON is never cached or served.

**What it protects against, and what it doesn't.**

- It does keep the key secret, limit what can be requested to four read-only endpoints with bounded params, cap how hard one IP can call it, and stop repeat traffic from reaching CoinGecko.
- It doesn't stop anyone else from calling it. Any value the app could send to prove it's the real app would ship in the bundle and could be copied, just like the key. CORS only restricts browsers, and `Origin` headers can be faked outside one. The data is public, so the worst case is someone using the proxy as rate-limited access to the same four endpoints.
- It doesn't fully protect the monthly budget. Coin detail, charts and search have unbounded keys (any coin, any query), so a determined client spread across many IPs can still miss the cache. The next steps would be a global budget guard (stretch cache lifetimes or serve stale once spend passes a threshold), short caching of 404s, and restricting CORS to the web app's domain once it's deployed. Real client verification would mean App Attest and Play Integrity on mobile and Turnstile on web, which is out of scope for public market data.

### Shared API client

The client, response schemas, error mapping and query hooks live in `packages/api` (`@crypto-markets/api`), so the mobile app and the planned web app use the same code to talk to the proxy.

**No platform code in the package.** The base URL differs per platform (the Android emulator reaches the host at `10.0.2.2`, and a web app reads its own env var), so the package exports `createApiClient(baseUrl)` and each app creates its client. Hooks get the client from an `ApiClientProvider`, the same pattern as TanStack Query's `QueryClientProvider`. Tests inject a stub client or a mock server the same way. A module-level `configureApi()` would be less code, but it is hidden global state that every test would have to reset.

**Every response is validated with zod.** The original take-home used hand-written parsers to avoid a dependency for four endpoints. With a second app consuming the same types, keeping types and runtime checks in sync by hand stopped being worth it: the types are now inferred from the schemas, so they can't drift. The request helper parses against a schema, so there is no unchecked cast anywhere. The rules per field are explicit:

- Identity fields (`id`, `name`, `symbol`) are required. Without them the response is rejected as invalid.
- Display fields fall back: a missing or non-numeric price becomes `null` and the UI shows "unavailable", so one bad field doesn't hide the whole screen. Obscure coins from search often have gaps, so this is normal rather than an error.
- Unknown fields are stripped, and a price series with any invalid point is rejected rather than drawn wrongly.

**Errors carry a kind.** `ApiError` is one of `network` (no response), `http` (the proxy returned an error status) or `invalid-response` (a 2xx body that wasn't JSON or didn't match the schema). Messages are mapped to user-safe copy by status; the proxy's `code` is kept for debugging. The copy never names the upstream provider or mentions keys, and anything that isn't an `ApiError` is shown as a generic message, so raw messages never reach the UI.

### Search uses CoinGecko's `/search` endpoint

The dashboard only holds the top 10 coins, so searching that list wouldn't let someone find anything else. Search therefore calls CoinGecko's `/search` endpoint, which matches on name and symbol across every listed coin. Matching and ranking are handled by CoinGecko, so I don't filter or re-order the results on the client.

Input is debounced by 400ms, and a query shorter than two characters never makes a request (the proxy rejects it too: one-letter queries match almost everything and each one is a separate, uncached upstream call). This keeps the number of calls down on a rate-limited API. Results are cached per search term by React Query, so repeating a recent search is instant. Selecting a result opens the same detail screen as the dashboard.

The trade-off is that search needs a network connection and spends API calls, whereas filtering a locally cached list would be instant and free. Search results can also include obscure tokens with very little data, so the response schemas and the detail screen treat missing fields as normal rather than as errors. The search screen has distinct states for loading, no results, and failure with a retry.

### TanStack Query for server state

React Query gives caching, request de-duplication, cancellation via `AbortSignal`, and retry without adding tens of lines of hand-written code.

**Retries are for transient failures only.** A failed query is retried once, and only for network errors, 408 and 5xx. A 4xx won't change on a second attempt, a response that failed validation will fail the same way again, and a bug in our own code shouldn't be hidden behind a retry. Every retry also counts against the rate limit.

**Each query sets its own `staleTime`.** The proxy's cache lifetime is a budget decision: it caps calls to CoinGecko however many people use the app. The client's `staleTime` is a UX decision about when to check again. A refetch inside the proxy's cache lifetime is served from the proxy's cache and never reaches CoinGecko, so the client can afford to be fresher than the proxy:

| Query | Client `staleTime` | Proxy cache |
|---|---|---|
| Top 10 markets | 2 min | 15 min |
| Coin detail | 5 min | 10 min |
| Search | 1 hour | 1 hour |
| Price chart (1D / 7D, 30D) | 5 min / 30 min | 5 min / 1 hour |

Reading the proxy's `Cache-Control` header to set `staleTime` would remove the duplication, but the fixed values are easier to reason about and test with four endpoints.

**Devices revalidate with the proxy instead of caching on their own.** The proxy sends `Cache-Control: no-cache`, so the platform HTTP cache (`NSURLCache` on iOS, OkHttp on Android, the browser cache on web) must ask the proxy before reusing a response. An earlier `max-age` equal to the proxy's remaining cache lifetime let the device answer refreshes itself: pull-to-refresh did nothing and failures never reached the app. Revalidating costs one Worker request answered from KV, not a CoinGecko call. That leaves two caches with clear owners: the proxy's protects the upstream budget, and the query cache decides what the user sees.

**"Updated 12 min ago" comes from CoinGecko's `last_updated`, not the fetch time.** The time a response arrived says nothing about how old the prices are once caches sit in between. CoinGecko's own timestamp passes through every layer unchanged, so the dashboard shows the age of the newest `last_updated` among its coins. A relative age suits a list that only gets new prices every 15 minutes: after a pull-to-refresh that brings nothing new, "12 min ago" is still true, where a clock time would look like the refresh had failed.

Price-history uses `keepPreviousData`, so switching between 1D, 7D and 30D keeps the old chart visible with a status line in order to preserve the screen layout.

### Currencies are a fixed list of three

While not part of the requirements, upon inspecting the CoinGecko API docs I noticed that it accepted a currency param, and decided to add a basic toggle to showcase this. I've included three currencies, GBP, USD and EUR, defined in `src/constants/currencies.ts`.

For a full implementation, I'd look to use the CoinGecko API to retrieve a full list of supported currencies, and add it to a context accessible throughout the app rather than simply passing it through route params for added flexibility.

### Dark theme only

One theme object in `src/constants/theme.ts`. I looked at some examples of existing apps and came up with a simple theme which I felt fits the project quite well. This is limited to a dark theme only, but would be simple to add a light alternative in a full implementation.

### Testing approach

Tests are for logic and data hooks rather than UI, covering request handling, error mapping, schemas and utils. Component/screen tests have been done manually.

The shared API package is tested at two boundaries. Client tests run against [MSW](https://mswjs.io), which intercepts `fetch` and answers like the proxy, so the code under test is exactly what ships: real requests, real `Response` objects, real parsing. Hook tests inject a stub client and focus on hook behaviour (debounce, placeholder data, reuse of fresh data). A few integration tests run hooks through the real client and MSW to check the pieces fit. A request with no matching handler fails the test, so nothing reaches the network. The handlers and fixtures are exported from `@crypto-markets/api/testing` for other apps to reuse. The package uses Vitest because MSW runs in Node without the polyfills a React Native Jest environment needs; nothing in it depends on React Native.

The proxy is tested with Vitest inside the Workers runtime (`@cloudflare/vitest-plugin`), against local KV and rate-limit bindings, with CoinGecko replaced by a stub of `fetch`. The tests cover the allow-list, cache key normalisation, hits and refreshes, trimming, serving stale data on failure, error mapping and the per-IP limit. Jest stays in the mobile app because `jest-expo` is the supported setup there; the proxy needs the Workers runtime, which Jest can't provide.

### Monorepo layout

The project is a pnpm workspace: the Expo app lives in `apps/mobile`, the API proxy in `apps/proxy`, and `packages/api` holds the shared API layer (client, schemas, query hooks) so a web app can reuse it. Logic is shared, UI is not; the web app will have its own interface.

Plain pnpm workspaces were chosen over Turborepo or Nx. With two or three packages, a task runner's caching and dependency graph don't save enough time to justify another tool to learn and configure; `pnpm -r` runs lint, typecheck and tests across every package. That would be revisited if CI times grow. Separate repositories were ruled out because shared types would then need publishing and versioning.

Expo configures Metro for monorepos automatically, so there is no custom `metro.config.js`. pnpm's default isolated install is kept rather than `nodeLinker: hoisted`, which keeps each package's dependencies explicit. Hoisting is the fallback if a native library fails to resolve.

### Continuous integration

A single GitHub Actions workflow runs on every pull request and on pushes to `main`. It installs with a frozen lockfile, then runs `pnpm lint`, `pnpm typecheck` and `pnpm test` across every workspace package: the same commands used locally. Node is pinned in `.nvmrc` and pnpm in the root `package.json` `packageManager` field, so local and CI toolchains match.

It is one job rather than one per check. Installing dependencies is most of the run time, so parallel jobs would mostly repeat it. Every package is checked on every run; running only the packages affected by a change (`pnpm --filter "...[origin/main]"` or a task runner) would be worth it once there are several apps and CI time grows. Actions are pinned to major version tags; pinning to commit SHAs with Dependabot updates is the stricter option. No secrets are needed: the proxy tests use a fake key and never call CoinGecko.

## Known gaps and what I'd do next

- Component/screen tests with React Native Testing Library.
- Deploy the proxy from CI, and add the global budget guard described under [API proxy](#api-proxy).
- Persist the selected currency and share it through context rather than route params.
- Fold the detail screen's inline `LoadState` into the shared `StateMessage` (they are visually different, so left separate for now).
- Pull-to-refresh exists on the dashboard only; the detail screen refreshes on retry after an error.
- The query cache currently lasts only for the session, so the app shows nothing on a cold start without a connection.

The API layer's gaps are reviewed in detail, with a prioritised fix plan, in [api-audit.md](api-audit.md).

## Dependencies

For this project I have attempted to keep the dependencies as light as possible, relying on core Expo or React Native components where available. Two major exceptions were made, the first being `react-native-gifted-charts`; I wanted to display the coin history as a chart, but Expo doesn't include a charting library.

The second is `@tanstack/react-query`. At first, I opted not to include this as I didn't believe the scope required it. Once I got into the implementation of the details screen the cache became far more complex and I decided that it did warrant the use of React Query to reduce this complexity.

Later, `zod` was added to the shared API package for response validation (see [Shared API client](#shared-api-client)), and `msw` for tests.

## AI assistance

Given the scope of this project, and the limited time to complete it, I opted to use Claude Code heavily for implementation. I first tailored the project rules `AGENTS.md`, which has been committed for visibility. These provide guidance and guardrails to Claude, alongside my instructions for each task.

Each feature was then built piece by piece, and before merging was reviewed by myself and another agent to catch any discrepancies or code smells.

UI decisions were scaffolded by myself and implemented with AI. A visual check was then done on both platforms and manual tweaks were done to achieve the desired results.
