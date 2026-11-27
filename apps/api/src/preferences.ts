import { currencySchema, preferencesPatchSchema, themeSchema } from "@crypto-markets/api/watchlist-schemas";

import { readJson } from "./body";
import type { AuthedContext } from "./context";
import { invalidRequest, jsonResponse } from "./http";

// The database stores NULL for "never set", so a default changed here reaches
// every user who never chose. A stored value that is no longer allowed (say a
// currency dropped from the list) also falls back to the default.
const currencyOrDefault = currencySchema.catch("gbp");
const themeOrDefault = themeSchema.catch("system");

type PreferencesRow = { currency: string | null; theme: string | null };

function preferencesBody(row: PreferencesRow | null) {
  return { currency: currencyOrDefault.parse(row?.currency), theme: themeOrDefault.parse(row?.theme) };
}

export async function getPreferences({ env, user }: AuthedContext): Promise<Response> {
  const row = await env.DB.prepare("SELECT currency, theme FROM preferences WHERE user_id = ?")
    .bind(user.id)
    .first<PreferencesRow>();
  return jsonResponse(preferencesBody(row));
}

// Updates only the fields given. Concurrent edits from two devices: last
// write wins per field.
export async function updatePreferences({ request, env, user }: AuthedContext): Promise<Response> {
  const result = preferencesPatchSchema.safeParse(await readJson(request));
  if (!result.success) throw invalidRequest(result.error.issues);
  const patch = result.data;

  // One upsert: creates the row on first save; otherwise COALESCE keeps the
  // stored value for any field not in the patch. RETURNING gives the full row.
  const row = await env.DB.prepare(
    `INSERT INTO preferences (user_id, currency, theme, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (user_id) DO UPDATE SET
       currency = COALESCE(excluded.currency, currency),
       theme = COALESCE(excluded.theme, theme),
       updated_at = excluded.updated_at
     RETURNING currency, theme`,
  )
    .bind(user.id, patch.currency ?? null, patch.theme ?? null, new Date().toISOString())
    .first<PreferencesRow>();

  return jsonResponse(preferencesBody(row));
}
