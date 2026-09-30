This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project

This is a small React Native application built with Expo and TypeScript.

The application displays cryptocurrency market data from the CoinGecko API.

This repository is being produced as part of a technical assessment. Code should therefore prioritise clarity, maintainability, and straightforward design choices over unnecessary abstraction.

## Efficiency

Use the cheapest validation that provides reasonable confidence.

Do not run expensive validation merely for completeness.

For routine TypeScript / React changes, do not run:

- Gradle builds
- Xcode builds
- CocoaPods installs
- app install / launch tasks
- Maestro or Playwright suites
- full-project test suites

Prefer targeted checks against the files or behaviour changed.

Do not escalate to native builds unless one of the conditions in the Native validation section applies.

## Development principles

- Use TypeScript.
- Prefer simple, readable implementations.
- Avoid unnecessary abstractions or premature optimisation.
- Prefer React Native and Expo APIs over additional dependencies where reasonable.
- Do not add dependencies unless they provide clear value.
- Follow existing project patterns before introducing new ones.
- Keep components small and focused.
- Extract reusable behaviour when there is genuine reuse.
- Avoid `any`.
- Avoid clever code that is difficult to explain.

## React Native

- Use functional React components and hooks.
- Consider mobile usability and different screen sizes.
- Avoid fixed dimensions where responsive layout is appropriate.
- Avoid deprecated React Native APIs.
- Use `FlatList` for lists of cryptocurrency data.
- Ensure loading, empty, and error states are handled.
- Consider accessibility for interactive elements.

## API integration

- CoinGecko is the external data source.
- Keep API calls separate from UI components.
- Define TypeScript types for API responses that the application actually consumes.
- Handle network failures and unexpected responses.
- Do not commit API credentials.
- Avoid silently swallowing API errors.

Relevant API endpoints include:

- `/coins/markets`
- `/coins/{id}`
- CoinGecko search endpoints where appropriate

## Project structure

Prefer a simple feature-oriented structure.

For example:

src/
api/
components/
features/
hooks/
navigation/
screens/
types/

Do not create layers or directories that are not justified by the size of the application.

## Testing

- Prefer testing important application behaviour over implementation details.
- Add tests for logic with meaningful edge cases.
- Do not create tests solely to increase test count.

## Changes

Before implementing a task:

1. Inspect the existing implementation.
2. Identify the smallest reasonable change.
3. Reuse existing components and utilities where appropriate.
4. Avoid unrelated refactors.
5. Run TypeScript/lint/tests after significant changes.

When completing a task:

- Briefly explain what was changed.
- Mention any important design decision or trade-off.
- Mention anything that should be manually tested.

## Assessment constraints

The application must:

- Display the top 10 cryptocurrencies by market cap.
- Allow a cryptocurrency to be opened for detailed information.
- Support searching by cryptocurrency name or symbol.
- Handle loading and API error states.
- Work well on mobile screen sizes.
- Integrate directly with CoinGecko.
- Be straightforward for another developer to run locally.
