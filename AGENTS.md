# AGENTS.md

Expo / React Native app showing CoinGecko market data. Mobile-first, also runs on web.

## Working rules

- **Plan first.** Before changing any code or files, state what you will change, which files, and any assumptions or open questions. Wait for an explicit yes. If the plan changes mid-task, stop and re-confirm.
- **Scope.** If a request falls outside the current task, say so and recommend a fresh session instead of continuing.

## Stack

- Expo SDK 57, React Native 0.86 (New Architecture), React 19, TypeScript
- Expo Router (file-based routes), TanStack Query for server state
- Jest + jest-expo + React Native Testing Library
- pnpm workspaces (`pnpm-workspace.yaml`, one `pnpm-lock.yaml` at the root)
- CoinGecko API, key from `apps/mobile/.env.local` (see `apps/mobile/.env.example`)

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS or React Native API, check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ or the index at https://docs.expo.dev/llms.txt (it lists common LLM misconceptions). Never answer from memory.

## Commands

From the repo root (`lint`, `typecheck`, `test` run in every workspace package):

```bash
pnpm install                # install all workspaces
pnpm start                  # Expo dev server (apps/mobile)
pnpm lint                   # lint
pnpm typecheck              # tsc --noEmit
pnpm test                   # jest
```

From `apps/mobile`:

```bash
npx expo install <package>  # ALWAYS use instead of pnpm add; resolves SDK-compatible versions
npx expo-doctor             # diagnose dependency/config issues
pnpm test <path>            # targeted tests, e.g. pnpm test src/utils
```

Workspace packages are referenced as `"@crypto-markets/api": "workspace:*"`. Expo configures Metro for monorepos automatically; don't add `watchFolders` or other resolver overrides.

Run lint and typecheck before declaring a task done.

## Structure

```
apps/
  mobile/        Expo app (own package.json, app.json, tsconfig, jest, eslint)
    src/
      app/         Expo Router routes only (_layout.tsx = navigators). No other code here.
      screens/     Screen components rendered by routes
      components/  Small presentational components
      hooks/       TanStack Query hooks (one per data need)
      api/         CoinGecko client, response types, parsers, errors
      utils/       Pure helpers (formatting, chart data)
      constants/   Theme, currencies, locale
      test/        Shared test helpers
packages/
  api/           @crypto-markets/api: shared API layer (empty; client and hooks move here)
docs/            Public design docs (DECISIONS.md, api-audit.md). Reviewer-facing.
```

## Conventions

- Simple, readable code over clever code or speculative abstraction. Follow existing patterns before adding new ones. Extract only on genuine reuse.
- Functional components and hooks. Keep components small and focused.
- Use `FlatList` for coin lists. Handle loading, empty and error states.
- Responsive layout over fixed dimensions. Add accessibility props on interactive elements.
- Keep API calls out of UI components: `api/` → `hooks/` → `screens/`.
- Type only the API fields the app consumes. Handle network failures and unexpected response shapes.
- Prefer Expo/RN APIs over new dependencies.
- Test behaviour and logic with meaningful edge cases, not implementation details. Put tests next to the file (`*.test.ts[x]`).
- Make the smallest reasonable change and reuse existing components and utilities.

## Don't

- Don't create or edit `apps/mobile/ios/` or `apps/mobile/android/` by hand. They are generated (CNG); configure via `app.json` and config plugins.
- Don't commit secrets, `.env*.local` or `.dev.vars`.
- Don't use `any`.
- Don't silently swallow API errors.
- Don't add dependencies without clear value.
- Don't use paid EAS builds. Prefer local or GitHub Actions builds.
- Don't make unrelated refactors.
- Don't run expensive validation for routine TS/React changes: no Gradle/Xcode builds, pod installs, app install/launch, Maestro/Playwright, or the full test suite. Run targeted tests for what changed. A native build is only justified when native code or config changes.
- Expo Go only bundles its own native modules. Adding a native library needs a development build (`npx expo run:ios|android`).

## Product requirements

Top 10 coins by market cap. Open a coin for details. Search by name or symbol. Handle loading and API errors. Work well on mobile screen sizes. Talk to CoinGecko directly (a proxy is planned). Easy for another developer to run locally.

## When done

Briefly explain what changed, any important design decision or trade-off, and what should be tested manually.
