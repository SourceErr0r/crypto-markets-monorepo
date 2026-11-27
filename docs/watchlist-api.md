# Watchlist API

The contract for the app's own backend: a watchlist of favourite coins and a few saved preferences, shared by the mobile and web apps. Status: **draft, not yet built**. The reasoning behind it is in [DECISIONS.md](DECISIONS.md#watchlist-api).

It runs as its own Cloudflare Worker (`apps/api`) with a D1 database. Market data still comes from the API proxy: this API stores coin ids, and the apps fetch prices for them with `/coins/markets?ids=…`.

## Conventions

- **Base path** `/v1`. A breaking change gets `/v2`; adding a field is not a breaking change, so clients must ignore fields they don't know.
- **JSON** in and out, `Content-Type: application/json`. Field names are camelCase. Timestamps are ISO 8601 strings in UTC (`"2026-11-27T14:03:00.000Z"`).
- **Auth.** Every route except `POST /v1/user` needs `Authorization: Bearer <token>`.
- **No caching.** Every response is `Cache-Control: no-store`, because it is one user's data.
- **CORS.** Any origin may call the API, and `Authorization` and `Content-Type` are allowed request headers. This is safe because the token is sent explicitly in a header, not as a cookie: a page on another site can't make a browser send it, so there is no cross-site request forgery to defend against. CORS will still be narrowed to the web app's domain when it is deployed.
- **Validation.** Request bodies and path params are checked with zod schemas shared from `@crypto-markets/api`, so clients and server use the same rules. Unknown body fields are rejected, not ignored, so a typo like `"curency"` fails loudly.

## Errors

Every error has the same shape as the API proxy's errors:

```json
{ "error": { "code": "invalid_request", "message": "currency must be one of gbp, usd, eur" } }
```

`code` is stable and clients branch on it; `message` is for developers, not for display.

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_request` | Malformed JSON, a body that fails validation, an invalid coin id |
| 401 | `unauthorized` | Missing, malformed or unknown token. Sent with `WWW-Authenticate: Bearer` |
| 404 | `not_found` | Unknown route |
| 405 | `method_not_allowed` | Known route, wrong method. Sent with an `Allow` header |
| 409 | `watchlist_full` | Adding a coin when the watchlist already has 50 |
| 413 | `payload_too_large` | Body over 4 KB |
| 415 | `unsupported_media_type` | A body that isn't `application/json` |
| 429 | `rate_limited` | Too many requests. Sent with `Retry-After` in seconds |
| 500 | `internal` | Anything unexpected. Logged; the message never includes internals |

A 401 tells the client its token is no longer valid, for example because the user was deleted from another device. The app then drops the token and starts a new anonymous user.

## Auth: anonymous first, accounts later

The apps work without sign-up. On first launch the app calls `POST /v1/user`, which creates an anonymous user and returns a token. The app stores the token (SecureStore on mobile, `localStorage` on web) and sends it with every request.

- Tokens are 32 random bytes, base64url-encoded, with a `wl_` prefix: `wl_` + 43 characters. The prefix lets secret scanners recognise a leaked token.
- The database stores only a SHA-256 hash of each token, so a leaked database copy contains no usable tokens. A slow password hash (bcrypt, scrypt) is unnecessary because the token is random, not chosen by a person: there is nothing to guess.
- Anonymous tokens don't expire. Losing the token (uninstall, cleared browser storage) loses the watchlist, which is the trade-off of having no account.

**Accounts, later.** Signing in will link an identity (an email or an OAuth provider) to the *existing* user id. Upgrading from anonymous to signed-in is then one inserted row, with no copying or merging of watchlists. Signing in on a second device returns a new token for the same user, so both devices see one watchlist. The sign-in routes will be designed when accounts are built; nothing in this contract has to change for them.

## Endpoints

### `POST /v1/user`

Creates an anonymous user. No auth, no body.

`201 Created`

```json
{
  "token": "wl_3q2-7wEXAMPLEj9Kx0fV1pZb8nR4tYcLs6mHdQaUeGo",
  "user": { "id": "2b1c6a3e-8f4d-4f7a-9c1e-5d2b7a9e0f13", "createdAt": "2026-11-27T14:03:00.000Z", "anonymous": true }
}
```

This is the only route that issues a token and the only one without auth, so it has its own tighter rate limit (see [Rate limits](#rate-limits)).

### `GET /v1/user`

The current user.

`200 OK`

```json
{ "id": "2b1c6a3e-8f4d-4f7a-9c1e-5d2b7a9e0f13", "createdAt": "2026-11-27T14:03:00.000Z", "anonymous": true }
```

### `DELETE /v1/user`

Deletes the user, their tokens, watchlist and preferences. Every token for the user stops working.

`204 No Content`

### `GET /v1/watchlist`

The user's watchlist, oldest first. An empty watchlist is `items: []`, not a 404.

`200 OK`

```json
{
  "items": [
    { "coinId": "bitcoin", "addedAt": "2026-11-27T14:05:12.000Z" },
    { "coinId": "solana", "addedAt": "2026-11-27T14:06:40.000Z" }
  ]
}
```

The response has ids only, no prices. The app passes the ids to the proxy's `/coins/markets?ids=…` (up to 50; the proxy sorts them and removes duplicates so any order shares one cache entry). Prices are then cached and rate-limited in one place, and this API never calls CoinGecko or spends its budget.

### `PUT /v1/watchlist/{coinId}`

Adds a coin. No body.

`204 No Content`, whether the coin was just added or was already there.

- `coinId` must match the proxy's coin id rule: lowercase letters, digits, `.`, `_` and `-`, starting with a letter or digit, at most 100 characters. Otherwise `400 invalid_request`.
- The id is **not** checked against CoinGecko. Checking would cost an upstream call per add. An id that doesn't exist simply returns no row from `/coins/markets`. The app only offers coins it has displayed, so this is rare.
- A watchlist holds up to 50 coins. Adding a 51st returns `409 watchlist_full`. 50 keeps a whole watchlist inside one proxy request.

### `DELETE /v1/watchlist/{coinId}`

Removes a coin.

`204 No Content`, whether or not the coin was on the list.

### `GET /v1/preferences`

The user's saved preferences. Fields never saved come back with their defaults, so the response always has every field.

`200 OK`

```json
{ "currency": "gbp", "theme": "system" }
```

| Field | Values | Default |
|---|---|---|
| `currency` | `gbp`, `usd`, `eur` (the proxy's currency list, shared from `@crypto-markets/api`) | `gbp` |
| `theme` | `system`, `light`, `dark` | `system` |

### `PATCH /v1/preferences`

Updates the fields given and leaves the rest. Returns the full preferences after the update.

Request:

```json
{ "theme": "dark" }
```

`200 OK`

```json
{ "currency": "gbp", "theme": "dark" }
```

An empty object, an unknown field or an invalid value returns `400 invalid_request`. When two devices edit preferences at the same time, the last write wins per field. That is acceptable for settings.

## Why these shapes

- **One resource per watchlist entry, not one list.** `PUT /v1/watchlist/{coinId}` adds a single coin. Replacing the whole list (`PUT /v1/watchlist` with every id) would let two devices overwrite each other: a phone adding Solana and a laptop adding Cardano at the same time would leave only one of them. Per-coin writes can't conflict.
- **Idempotent writes.** Adding a coin twice or removing one that isn't there returns the same 204. The client's retry logic can safely repeat a write that timed out, and a future offline queue can replay writes without first checking the current state.
- **`PUT` to add, not `POST`.** The client names the resource (the coin id), and repeating the request has no further effect, which is what `PUT` means. `POST /v1/watchlist` with a body would work, but it suggests the server creates a new resource each time.
- **`/v1/user`, singular.** The token decides which user it is, so a route like `/users/{id}` would only invite requests for other users' ids that the server must then refuse.

## Rate limits

Workers Rate Limiting binding, approximate and counted per Cloudflare location, the same as the proxy.

| Route | Key | Limit |
|---|---|---|
| `POST /v1/user` | client IP | 5 per minute |
| Everything else | user id | 60 per minute |

Authenticated routes are limited per user, not per IP, so many users behind one carrier IP don't share a limit. Creating users is limited per IP because there is no user yet; the limit is low because a person needs only one, but high enough for a household behind one router.

## Data model (D1)

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- UUID v4
  created_at  TEXT NOT NULL               -- ISO 8601
);

CREATE TABLE tokens (
  token_hash  TEXT PRIMARY KEY,           -- SHA-256 of the token, hex
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);
CREATE INDEX tokens_user_id ON tokens(user_id);

CREATE TABLE watchlist_items (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_id     TEXT NOT NULL,
  added_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, coin_id)          -- one row per coin; makes PUT idempotent
);

CREATE TABLE preferences (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  currency    TEXT,                       -- NULL = default
  theme       TEXT,
  updated_at  TEXT NOT NULL
);
```

- D1 enforces foreign keys by default, so deleting a user cascades to their tokens, watchlist and preferences in one statement.
- `anonymous` in responses is derived, not stored: it is true while the user has no linked identity. Accounts will add an `identities (provider, subject, user_id)` table, so upgrading inserts one row.
- Preferences store `NULL` for "never set" rather than writing defaults, so changing a default later reaches users who never chose.
- No `last_used_at` on tokens yet. Updating it on every request would turn every read into a write, and D1's free tier allows 100,000 written rows a day against 5 million read.
- Schema changes go through D1 migrations (`wrangler d1 migrations`), applied locally for tests and from CI on deploy.

## Not in this version

- **Accounts and sign-in.** Designed for above, built later.
- **Cleaning up abandoned anonymous users.** Every uninstall leaves a user behind. A scheduled job deleting users idle for, say, a year needs `last_used_at`, written at most once a day.
- **Token rotation and a per-device sign-out.** Not useful while a token *is* the account; they come with sign-in.
- **Ordering the watchlist by hand.** Entries are ordered by when they were added, and the app can sort by market cap. A manual order would need a `position` column and a reorder endpoint.
