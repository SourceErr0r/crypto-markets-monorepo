// Checks the database rules the routes will rely on, against the real
// migrations. Each test file gets its own isolated storage.
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const NOW = "2026-11-27T14:03:00.000Z";

async function insertUser(id: string) {
  await env.DB.prepare("INSERT INTO users (id, created_at) VALUES (?, ?)").bind(id, NOW).run();
}

async function addCoin(userId: string, coinId: string) {
  await env.DB.prepare("INSERT INTO watchlist_items (user_id, coin_id, added_at) VALUES (?, ?, ?)")
    .bind(userId, coinId, NOW)
    .run();
}

async function countRows(table: string, userId: string): Promise<number> {
  // Table names can't be bound as parameters; these come from the tests only.
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe("schema", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM users");
    await insertUser("user-1");
  });

  it("allows each coin once per user", async () => {
    await addCoin("user-1", "bitcoin");
    await expect(addCoin("user-1", "bitcoin")).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it("lets different users watch the same coin", async () => {
    await insertUser("user-2");
    await addCoin("user-1", "bitcoin");
    await addCoin("user-2", "bitcoin");
    expect(await countRows("watchlist_items", "user-2")).toBe(1);
  });

  it("rejects rows for a user that doesn't exist", async () => {
    await expect(addCoin("no-such-user", "bitcoin")).rejects.toThrow(/FOREIGN KEY constraint failed/);
  });

  it("deletes a user's tokens, watchlist and preferences with the user", async () => {
    await insertUser("user-2");
    for (const userId of ["user-1", "user-2"]) {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)").bind(
          `hash-${userId}`,
          userId,
          NOW,
        ),
        env.DB.prepare("INSERT INTO watchlist_items (user_id, coin_id, added_at) VALUES (?, ?, ?)").bind(
          userId,
          "bitcoin",
          NOW,
        ),
        env.DB.prepare("INSERT INTO preferences (user_id, currency, theme, updated_at) VALUES (?, ?, ?, ?)").bind(
          userId,
          "usd",
          null,
          NOW,
        ),
      ]);
    }

    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind("user-1").run();

    for (const table of ["tokens", "watchlist_items", "preferences"]) {
      expect(await countRows(table, "user-1")).toBe(0);
      expect(await countRows(table, "user-2")).toBe(1);
    }
  });
});
