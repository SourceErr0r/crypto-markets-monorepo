# Decisions and trade-offs

## Scope

The brief was a small app: top 10 coins by market cap with a detail view, search by name or symbol, loading and error handling, mobile-friendly, calling CoinGecko directly. It was built in roughly six hours over the course of the week.

This document records the decisions in that take-home baseline. The project is now being extended. [api-audit.md](api-audit.md) reviews the baseline and sets out the planned fixes.

## Decisions

### Expo Router with a thin `app/` directory

Files in `src/app/` only re-export a screen from `src/screens/`. Routing stays declarative, and screens, components and hooks are not mixed into route files (Expo Router treats every file under `app/` as a route). The cost is one extra file per route.

Search is a modal presentation and the detail view is a normal stack push. Selecting a search result uses `router.replace`, which replaces the search modal with the details screen on the main stack, allowing the user to return to the dashboard.

### Direct CoinGecko calls

A full implementation would use a server-side proxy to keep keys secure. The brief here was to use direct integration and the goal is an app running locally, so the decision was made to put the key into an `EXPO_PUBLIC_` variable. A production build of the app would not be secure for this reason, but it will suffice for this project.

### A small API layer with hand-written parsers

`src/api/` is split into the request function (`coingecko.ts`), response parsers (`coingecko-parsers.ts`), error mapping (`coingecko-errors.ts`) and types (`coingecko.types.ts`). Responses are parsed from `unknown` rather than cast, so malformed data produces a "couldn't read this" error instead of a crash further down the tree.

I opted to use hand-written parsers rather than a schema library such as Zod to avoid adding a dependency and extra complexity for the sake of only four endpoints.

Errors are mapped to user-safe messages. CoinGecko's own error codes take precedence over HTTP status. Raw messages never reach the UI.

### Search uses CoinGecko's `/search` endpoint

The dashboard only holds the top 10 coins, so searching that list wouldn't let someone find anything else. Search therefore calls CoinGecko's `/search` endpoint, which matches on name and symbol across every listed coin. Matching and ranking are handled by CoinGecko, so I don't filter or re-order the results on the client.

Input is debounced by 400ms, and an empty or whitespace-only query never makes a request. This keeps the number of calls down on a rate-limited API. Results are cached per search term by React Query, so repeating a recent search is instant. Selecting a result opens the same detail screen as the dashboard.

The trade-off is that search needs a network connection and spends API calls, whereas filtering a locally cached list would be instant and free. Search results can also include obscure tokens with very little data, so the parsers and the detail screen treat missing fields as normal rather than as errors. The search screen has distinct states for loading, no results, and failure with a retry.

### TanStack Query for server state

React Query gives caching, request de-duplication, cancellation via `AbortSignal`, and retry without adding tens of lines of hand-written code. Defaults are a 5-minute `staleTime` and a single retry, and only for errors that could be transient (network, 408, 5xx). Retrying a 429 would count against the rate limit and is unlikely to help.

Price-history uses `keepPreviousData`, so switching between 1D, 7D and 30D keeps the old chart visible with a status line in order to preserve the screen layout.

### Currencies are a fixed list of three

While not part of the requirements, upon inspecting the CoinGecko API docs I noticed that it accepted a currency param, and decided to add a basic toggle to showcase this. I've included three currencies, GBP, USD and EUR, defined in `src/constants/currencies.ts`.

For a full implementation, I'd look to use the CoinGecko API to retrieve a full list of supported currencies, and add it to a context accessible throughout the app rather than simply passing it through route params for added flexibility.

### Dark theme only

One theme object in `src/constants/theme.ts`. I looked at some examples of existing apps and came up with a simple theme which I felt fits the project quite well. This is limited to a dark theme only, but would be simple to add a light alternative in a full implementation.

### Testing approach

Tests are for logic and data hooks rather than UI, covering request handling, error mapping, utils and parsers. Component/screen tests have been done manually.

### Monorepo layout

The project is a pnpm workspace: the Expo app lives in `apps/mobile`, and `packages/api` will hold the API layer (client, schemas, query hooks) so a web app and the planned API proxy can share it. Logic is shared, UI is not; the web app will have its own interface.

Plain pnpm workspaces were chosen over Turborepo or Nx. With two or three packages, a task runner's caching and dependency graph don't save enough time to justify another tool to learn and configure; `pnpm -r` runs lint, typecheck and tests across every package. That would be revisited if CI times grow. Separate repositories were ruled out because shared types would then need publishing and versioning.

Expo configures Metro for monorepos automatically, so there is no custom `metro.config.js`. pnpm's default isolated install is kept rather than `nodeLinker: hoisted`, which keeps each package's dependencies explicit. Hoisting is the fallback if a native library fails to resolve.

## Known gaps and what I'd do next

- Component/screen tests with React Native Testing Library.
- Move CoinGecko calls behind a proxy so the key stays secret.
- Persist the selected currency and share it through context rather than route params.
- Fold the detail screen's inline `LoadState` into the shared `StateMessage` (they are visually different, so left separate for now).
- Pull-to-refresh exists on the dashboard only; the detail screen refreshes on retry after an error.
- The query cache currently lasts only for the session, so the app shows nothing on a cold start without a connection.

The API layer's gaps are reviewed in detail, with a prioritised fix plan, in [api-audit.md](api-audit.md).

## Dependencies

For this project I have attempted to keep the dependencies as light as possible, relying on core Expo or React Native components where available. Two major exceptions were made, the first being `react-native-gifted-charts`; I wanted to display the coin history as a chart, but Expo doesn't include a charting library.

The second is `@tanstack/react-query`. At first, I opted not to include this as I didn't believe the scope required it. Once I got into the implementation of the details screen the cache became far more complex and I decided that it did warrant the use of React Query to reduce this complexity.

## AI assistance

Given the scope of this project, and the limited time to complete it, I opted to use Claude Code heavily for implementation. I first tailored the project rules `AGENTS.md`, which has been committed for visibility. These provide guidance and guardrails to Claude, alongside my instructions for each task.

Each feature was then built piece by piece, and before merging was reviewed by myself and another agent to catch any discrepancies or code smells.

UI decisions were scaffolded by myself and implemented with AI. A visual check was then done on both platforms and manual tweaks were done to achieve the desired results.
