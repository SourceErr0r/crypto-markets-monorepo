# Crypto Markets

An Expo and React Native app that displays cryptocurrency market data from CoinGecko.

## Build and run

```bash
corepack enable
pnpm install
pnpm start
```

With the Expo development server running, press `i` to open the iOS Simulator or `a` to open an Android emulator.

## Prerequisites and setup

- A current Node.js LTS release.
- pnpm, available through Corepack (included with current Node.js releases).
- Xcode with an iOS Simulator, or Android Studio with an Android emulator.
- A CoinGecko Demo API key.

Create a local environment file from the example:

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

## Useful commands

```bash
pnpm start       # Start Expo
pnpm ios         # Start Expo and open iOS Simulator
pnpm android     # Start Expo and open Android emulator
pnpm web         # Start the web version
pnpm lint        # Run linting
npx tsc --noEmit # Type-check the project
```
