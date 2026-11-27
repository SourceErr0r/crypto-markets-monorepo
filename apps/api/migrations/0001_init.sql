-- Initial schema. See docs/watchlist-api.md (Data model).
-- Timestamps are ISO 8601 strings in UTC. D1 enforces foreign keys by default.

CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- UUID v4
  created_at  TEXT NOT NULL
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
