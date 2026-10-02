# Crypto Markets

An Expo and React Native app that displays cryptocurrency market data from CoinGecko: the top 10 coins by market cap, searchable by name or symbol, with a detail view and price history chart for each coin.

Design decisions and trade-offs are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Prerequisites

- A current Node.js LTS release.
- pnpm 9 or later. Enable it with `corepack enable`, or install it with `npm install -g pnpm`.
- Xcode with an iOS Simulator, or Android Studio with an Android emulator.
- Optional: a free [CoinGecko Demo API key](https://www.coingecko.com/en/api/pricing). See [API key](#api-key).

## Build and run

```bash
pnpm install
pnpm start
```

With the Expo development server running, press `i` to open the iOS Simulator or `a` to open an Android emulator. `pnpm web` also starts a web version.

The app runs without any configuration. Add an API key if you want higher rate limits.

## API key

The app talks directly to CoinGecko's public API (`https://api.coingecko.com/api/v3`).

- **Without a key** the app works, but CoinGecko applies a lower, shared rate limit to unauthenticated requests. If you hit it, the app shows a "Too many requests" message. Wait a minute and retry.
- **With a Demo key** requests are sent with the `x-cg-demo-api-key` header and get a more generous limit. Only Demo keys are supported. A Pro key will be rejected because the app uses the public endpoint.

To add a key, create a local environment file from the example:

```bash
cp .env.example .env.local
```

Then add your key to `.env.local`:

```env
EXPO_PUBLIC_COINGECKO_API_KEY=your_coin_gecko_demo_key
```

Restart the Expo development server after changing environment configuration, then fully reload the app in the simulator.

### API key security

The app calls CoinGecko directly and intentionally does not include a backend proxy. Expo exposes variables prefixed with `EXPO_PUBLIC_` to client code, so this API key is a public, revocable client credential rather than a server secret.

Use a dedicated, low-privilege CoinGecko Demo key and keep it in `.env.local`, which is excluded from version control. A production application should move CoinGecko requests behind a server-side proxy, where the key can remain secret.

## Data fetching and caching

Server data is fetched with [TanStack Query](https://tanstack.com/query). It caches responses per query key for five minutes, de-duplicates in-flight requests, cancels abandoned ones and handles retries. This keeps range switching on the price chart instant and reduces pressure on CoinGecko's rate limits, without hand-written cache code. Response validation lives in `src/api/coingecko-parsers.ts`.

## Project structure

```text
src/
  app/          Expo Router routes (thin re-exports of screens)
  screens/      Screen-level components
  components/   Reusable UI components
  hooks/        Data-fetching hooks built on TanStack Query
  api/          CoinGecko requests, response parsers, error mapping and types
  utils/        Formatting and chart helpers
  constants/    Currencies, locale and theme
```

## Useful commands

```bash
pnpm start        # Start Expo
pnpm ios          # Start Expo and open iOS Simulator
pnpm android      # Start Expo and open Android emulator
pnpm web          # Start the web version
pnpm test         # Run the Jest test suite
pnpm lint         # Run linting
pnpm exec tsc --noEmit  # Type-check the project
```

Tests cover the API layer, hooks and formatting utilities. There are no UI tests.
