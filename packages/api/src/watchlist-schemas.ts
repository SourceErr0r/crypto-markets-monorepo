import { z } from "zod";

import { CURRENCY_CODES } from "./currencies";

// Request rules for the watchlist API (docs/watchlist-api.md), shared by the
// Worker that enforces them and the apps that send requests. Imports zod only,
// so the Worker can use it without React (subpath export, see package.json).

// The API proxy's coin id rule (apps/proxy/src/routes.ts keeps a copy until
// the proxy depends on this package). Starts with a letter or digit, so "."
// and ".." can't be ids.
export const COIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export const coinIdSchema = z.string().regex(COIN_ID_PATTERN, "invalid coin id");

export const WATCHLIST_MAX_ITEMS = 50;

export const THEMES = ["system", "light", "dark"] as const;
export const themeSchema = z.enum(THEMES);
export const currencySchema = z.enum(CURRENCY_CODES);

// PATCH body: any subset of the preferences, but not nothing. Strict, so a
// typo like "curency" fails instead of being silently dropped.
export const preferencesPatchSchema = z
  .strictObject({ currency: currencySchema.optional(), theme: themeSchema.optional() })
  .refine((patch) => Object.keys(patch).length > 0, "include at least one preference");

export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export type Theme = z.infer<typeof themeSchema>;
