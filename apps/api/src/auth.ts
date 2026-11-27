import { HttpError } from "./http";

// Anonymous bearer tokens (docs/watchlist-api.md#auth-anonymous-first-accounts-later).
// A token is 32 random bytes, base64url-encoded, with a `wl_` prefix so
// secret scanners can recognise a leaked one. The database stores only its
// SHA-256 hash. A slow hash (bcrypt) isn't needed: the token is random, not
// chosen by a person, so there is nothing to guess.

const TOKEN_PREFIX = "wl_";
// 32 bytes = 43 base64url characters without padding.
const TOKEN_PATTERN = /^wl_[A-Za-z0-9_-]{43}$/;

export type User = { id: string; createdAt: string };

export function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const base64 = btoa(String.fromCharCode(...bytes));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return TOKEN_PREFIX + base64url;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unauthorized(): HttpError {
  return new HttpError(401, "unauthorized", "Missing or invalid token.", { "WWW-Authenticate": "Bearer" });
}

// The user behind `Authorization: Bearer <token>`, or a 401. A token in the
// wrong format is refused before it costs a database read.
export async function authenticate(request: Request, db: D1Database): Promise<User> {
  const match = /^Bearer +(\S+)$/i.exec(request.headers.get("Authorization") ?? "");
  const token = match?.[1];
  if (!token || !TOKEN_PATTERN.test(token)) throw unauthorized();

  const row = await db
    .prepare(
      "SELECT users.id, users.created_at FROM tokens JOIN users ON users.id = tokens.user_id WHERE tokens.token_hash = ?",
    )
    .bind(await hashToken(token))
    .first<{ id: string; created_at: string }>();
  if (!row) throw unauthorized();

  return { id: row.id, createdAt: row.created_at };
}
