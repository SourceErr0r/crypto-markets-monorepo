import { coinIdSchema, WATCHLIST_MAX_ITEMS } from "@crypto-markets/api/watchlist-schemas";

import type { AuthedContext } from "./context";
import { HttpError, invalidRequest, jsonResponse, noContent } from "./http";

// Path params aren't URL-decoded: a valid coin id has no characters that need
// encoding, so anything encoded fails the pattern anyway.
function parseCoinId(params: AuthedContext["params"]): string {
  const result = coinIdSchema.safeParse(params.coinId);
  if (!result.success) throw invalidRequest(result.error.issues);
  return result.data;
}

export async function getWatchlist({ env, user }: AuthedContext): Promise<Response> {
  // Oldest first. rowid breaks ties between coins added in the same millisecond.
  const { results } = await env.DB.prepare(
    "SELECT coin_id, added_at FROM watchlist_items WHERE user_id = ? ORDER BY added_at, rowid",
  )
    .bind(user.id)
    .all<{ coin_id: string; added_at: string }>();

  return jsonResponse({ items: results.map((row) => ({ coinId: row.coin_id, addedAt: row.added_at })) });
}

// Idempotent: 204 whether the coin was just added or was already there.
export async function addCoin({ env, user, params }: AuthedContext): Promise<Response> {
  const coinId = parseCoinId(params);

  // The cap check and the insert are one statement, so two devices adding at
  // the same time can't both pass the check and overshoot it. ON CONFLICT
  // makes a repeat add a no-op (primary key user_id + coin_id).
  const { meta } = await env.DB.prepare(
    `INSERT INTO watchlist_items (user_id, coin_id, added_at)
     SELECT ?1, ?2, ?3
     WHERE (SELECT COUNT(*) FROM watchlist_items WHERE user_id = ?1) < ?4
     ON CONFLICT DO NOTHING`,
  )
    .bind(user.id, coinId, new Date().toISOString(), WATCHLIST_MAX_ITEMS)
    .run();
  if (meta.changes > 0) return noContent();

  // Nothing inserted: either the coin was already there (fine, even when the
  // list is full) or the list is full.
  const existing = await env.DB.prepare("SELECT 1 FROM watchlist_items WHERE user_id = ? AND coin_id = ?")
    .bind(user.id, coinId)
    .first();
  if (existing) return noContent();

  throw new HttpError(409, "watchlist_full", `A watchlist holds at most ${WATCHLIST_MAX_ITEMS} coins.`);
}

// Idempotent: 204 whether or not the coin was on the list.
export async function removeCoin({ env, user, params }: AuthedContext): Promise<Response> {
  const coinId = parseCoinId(params);
  await env.DB.prepare("DELETE FROM watchlist_items WHERE user_id = ? AND coin_id = ?").bind(user.id, coinId).run();
  return noContent();
}
