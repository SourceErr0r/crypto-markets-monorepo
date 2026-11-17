# Crypto Markets

[![CI](https://github.com/SourceErr0r/crypto-markets-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/SourceErr0r/crypto-markets-monorepo/actions/workflows/ci.yml)

An Expo and React Native app that displays cryptocurrency market data from CoinGecko: the top 10 coins by market cap, searchable by name or symbol, with a detail view and price history chart for each coin.

This project started as a small technical assessment, which I've since chosen to expand into a fuller product covering the API layer, security, CI/CD, and mobile plus web. The original submission is tagged `take-home-submission`.

Design decisions and an audit of the API layer, with the plan for what comes next, are in [docs/](docs/).

## Prerequisites

- A current Node.js LTS release.
- pnpm 9 or later. Enable it with `corepack enable`, or install it with `npm install -g pnpm`.
- Xcode with an iOS Simulator, or Android Studio with an Android emulator.
- Optional: a free [CoinGecko Demo API key](https://www.coingecko.com/en/api/pricing). See [API proxy and key](#api-proxy-and-key).

## Build and run

The app gets its data from a small API proxy (`apps/proxy`, a Cloudflare Worker) that runs locally. Start it first, then the app, in two terminals from the repository root:

```bash
pnpm install
pnpm proxy     # terminal 1: API proxy on http://localhost:8787
pnpm start     # terminal 2: Expo development server
```

With the Expo development server running, press `i` to open the iOS Simulator or `a` to open an Android emulator. Both can run side by side: the app reaches the proxy at `localhost` on iOS and web, and at `10.0.2.2` (the emulator's address for your machine) on Android. `pnpm web` also starts a web version.

Both run without any configuration. Add an API key if you want higher rate limits.

**Physical device:** start the proxy with `pnpm proxy --ip 0.0.0.0`, then set `EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:8787` in `apps/mobile/.env.local` (copy it from `apps/mobile/.env.example`). Restart the Expo server after changing it.

## API proxy and key

The app never talks to CoinGecko directly. It calls the proxy, which holds the CoinGecko key, allows only the four endpoints the app uses, caches responses and rate-limits each IP. The design and its limits are in [docs/DECISIONS.md](docs/DECISIONS.md#api-proxy).

- **Without a key** the proxy uses CoinGecko's keyless public tier, which has a lower, shared rate limit. If you hit it, the app shows a "busy" message. Wait a minute and retry.
- **With a Demo key** the proxy sends it with every request. Only Demo keys are supported.

To add a key, create the proxy's local secrets file from the example and add your key:

```bash
cp apps/proxy/.dev.vars.example apps/proxy/.dev.vars
```

```env
COINGECKO_API_KEY=your_coin_gecko_demo_key
```

`.dev.vars` is excluded from version control. Restart the proxy after changing it. A deployed Worker reads the key from a secret (`wrangler secret put COINGECKO_API_KEY`) instead.

## Data fetching and caching

Server data is fetched with [TanStack Query](https://tanstack.com/query). It caches responses per query key for five minutes, de-duplicates in-flight requests, cancels abandoned ones and handles retries. This keeps range switching on the price chart instant without hand-written cache code. The proxy adds a second, shared cache, so many users are served by one upstream call. Response validation lives in `apps/mobile/src/api/coingecko-parsers.ts`.

## Project structure

The repository is a [pnpm workspace](https://pnpm.io/workspaces):

```text
apps/
  mobile/         Expo app (iOS, Android, web)
    src/
      app/          Expo Router routes (thin re-exports of screens)
      screens/      Screen-level components
      components/   Reusable UI components
      hooks/        Data-fetching hooks built on TanStack Query
      api/          API requests, response parsers, error mapping and types
      utils/        Formatting and chart helpers
      constants/    Currencies, locale and theme
  proxy/          API proxy (Cloudflare Worker): allow-list, caching, rate limiting
packages/
  api/            Shared API layer (empty for now; the client and hooks will move here)
```

## Useful commands

```bash
pnpm start        # Start Expo
pnpm ios          # Start Expo and open iOS Simulator
pnpm android      # Start Expo and open Android emulator
pnpm web          # Start the web version
pnpm proxy        # Start the API proxy locally
pnpm test         # Run tests in every workspace package
pnpm lint         # Lint every workspace package
pnpm typecheck    # Type-check every workspace package
```

All commands run from the repository root. CI runs `pnpm lint`, `pnpm typecheck` and `pnpm test` on every pull request and push to `main` (see `.github/workflows/ci.yml`). To add a dependency to the app, run `npx expo install <package>` inside `apps/mobile`.

Tests cover the API layer, hooks and formatting utilities. There are no UI tests.
