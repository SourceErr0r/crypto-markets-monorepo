// Runs the Worker against a local D1 database (the real migrations, see
// test-setup.ts) and local rate-limit bindings.
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "./index";

type CallOptions = {
  token?: string;
  body?: unknown; // Sent as JSON unless it's already a string.
  headers?: Record<string, string>;
  ip?: string;
};

// Each call gets its own IP unless one is given, so the per-IP limit only
// applies in the test that checks it. Every test also uses fresh users.
async function call(method: string, path: string, options: CallOptions = {}) {
  const { token, body, ip = crypto.randomUUID() } = options;
  const headers: Record<string, string> = { "CF-Connecting-IP": ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const request = new Request(`http://api.test${path}`, {
    method,
    headers: { ...headers, ...options.headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  }) as Request<unknown, IncomingRequestCfProperties>;
  return worker.fetch(request, env);
}

async function newUser(): Promise<string> {
  const response = await call("POST", "/v1/user");
  const { token } = await response.json<{ token: string }>();
  return token;
}

async function errorCode(response: Response): Promise<string> {
  const { error } = await response.json<{ error: { code: string } }>();
  return error.code;
}

async function watchlistIds(token: string): Promise<string[]> {
  const response = await call("GET", "/v1/watchlist", { token });
  const { items } = await response.json<{ items: { coinId: string }[] }>();
  return items.map((item) => item.coinId);
}

afterEach(() => vi.restoreAllMocks());

describe("users", () => {
  it("creates an anonymous user and returns its token once", async () => {
    const response = await call("POST", "/v1/user");
    expect(response.status).toBe(201);
    const body = await response.json<{ token: string; user: { id: string } }>();
    expect(body).toEqual({
      token: expect.stringMatching(/^wl_[A-Za-z0-9_-]{43}$/),
      user: { id: expect.any(String), createdAt: expect.any(String), anonymous: true },
    });

    // Only the hash is stored.
    const stored = await env.DB.prepare("SELECT token_hash FROM tokens WHERE user_id = ?")
      .bind(body.user.id)
      .first<{ token_hash: string }>();
    expect(stored?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.token_hash).not.toContain(body.token);
  });

  it("returns the current user for its token", async () => {
    const created = await (await call("POST", "/v1/user")).json<{ token: string; user: unknown }>();
    const response = await call("GET", "/v1/user", { token: created.token });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(created.user);
  });

  it("ignores a body on POST /v1/user", async () => {
    const response = await call("POST", "/v1/user", { body: { anything: true } });
    expect(response.status).toBe(201);
  });

  it("deletes the user, after which the token stops working", async () => {
    const token = await newUser();
    await call("PUT", "/v1/watchlist/bitcoin", { token });

    expect((await call("DELETE", "/v1/user", { token })).status).toBe(204);
    expect((await call("GET", "/v1/user", { token })).status).toBe(401);
  });
});

describe("auth", () => {
  it.each([
    ["no header", undefined],
    ["a malformed token", "Bearer not-a-token"],
    ["another scheme", `Basic wl_${"a".repeat(43)}`],
    ["an unknown token", `Bearer wl_${"a".repeat(43)}`],
  ])("returns 401 with WWW-Authenticate for %s", async (_, authorization) => {
    const headers: Record<string, string> = authorization ? { Authorization: authorization } : {};
    const response = await call("GET", "/v1/watchlist", { headers });
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(await errorCode(response)).toBe("unauthorized");
  });

  it("keeps each user's data separate", async () => {
    const alice = await newUser();
    const bob = await newUser();
    await call("PUT", "/v1/watchlist/bitcoin", { token: alice });
    await call("PATCH", "/v1/preferences", { token: alice, body: { theme: "dark" } });

    expect(await watchlistIds(bob)).toEqual([]);
    const bobPreferences = await call("GET", "/v1/preferences", { token: bob });
    expect(await bobPreferences.json()).toEqual({ currency: "gbp", theme: "system" });
  });
});

describe("watchlist", () => {
  it("starts empty", async () => {
    const response = await call("GET", "/v1/watchlist", { token: await newUser() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
  });

  it("adds coins, oldest first, with when each was added", async () => {
    const token = await newUser();
    for (const id of ["solana", "bitcoin", "cardano"]) {
      expect((await call("PUT", `/v1/watchlist/${id}`, { token })).status).toBe(204);
    }

    const response = await call("GET", "/v1/watchlist", { token });
    const { items } = await response.json<{ items: { coinId: string; addedAt: string }[] }>();
    expect(items.map((item) => item.coinId)).toEqual(["solana", "bitcoin", "cardano"]);
    expect(items[0]?.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("treats adding a coin twice as one add", async () => {
    const token = await newUser();
    await call("PUT", "/v1/watchlist/bitcoin", { token });
    expect((await call("PUT", "/v1/watchlist/bitcoin", { token })).status).toBe(204);
    expect(await watchlistIds(token)).toEqual(["bitcoin"]);
  });

  it("removes coins, and removing one that isn't there is still 204", async () => {
    const token = await newUser();
    await call("PUT", "/v1/watchlist/bitcoin", { token });
    expect((await call("DELETE", "/v1/watchlist/bitcoin", { token })).status).toBe(204);
    expect((await call("DELETE", "/v1/watchlist/bitcoin", { token })).status).toBe(204);
    expect(await watchlistIds(token)).toEqual([]);
  });

  it.each(["Bitcoin", "-coin", "bit%20coin", "a".repeat(101)])("rejects the coin id %j", async (id) => {
    const response = await call("PUT", `/v1/watchlist/${id}`, { token: await newUser() });
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("invalid_request");
  });

  describe("when the watchlist is full", () => {
    async function fullWatchlist(): Promise<string> {
      const token = await newUser();
      // Seeded directly: 50 requests would also hit the per-user rate limit.
      const { id: userId } = await (await call("GET", "/v1/user", { token })).json<{ id: string }>();
      await env.DB.batch(
        Array.from({ length: 50 }, (_, i) =>
          env.DB.prepare("INSERT INTO watchlist_items (user_id, coin_id, added_at) VALUES (?, ?, ?)").bind(
            userId,
            `coin-${i}`,
            new Date().toISOString(),
          ),
        ),
      );
      return token;
    }

    it("refuses a 51st coin with 409", async () => {
      const token = await fullWatchlist();
      const response = await call("PUT", "/v1/watchlist/bitcoin", { token });
      expect(response.status).toBe(409);
      expect(await errorCode(response)).toBe("watchlist_full");
      expect(await watchlistIds(token)).toHaveLength(50);
    });

    it("still accepts a coin that is already on it", async () => {
      const token = await fullWatchlist();
      expect((await call("PUT", "/v1/watchlist/coin-7", { token })).status).toBe(204);
    });

    it("accepts a coin again after one is removed", async () => {
      const token = await fullWatchlist();
      await call("DELETE", "/v1/watchlist/coin-7", { token });
      expect((await call("PUT", "/v1/watchlist/bitcoin", { token })).status).toBe(204);
    });
  });
});

describe("preferences", () => {
  it("returns the defaults before anything is saved", async () => {
    const response = await call("GET", "/v1/preferences", { token: await newUser() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ currency: "gbp", theme: "system" });
  });

  it("updates only the fields given and returns the full preferences", async () => {
    const token = await newUser();
    const first = await call("PATCH", "/v1/preferences", { token, body: { theme: "dark" } });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ currency: "gbp", theme: "dark" });

    const second = await call("PATCH", "/v1/preferences", { token, body: { currency: "usd" } });
    expect(await second.json()).toEqual({ currency: "usd", theme: "dark" });

    const saved = await call("GET", "/v1/preferences", { token });
    expect(await saved.json()).toEqual({ currency: "usd", theme: "dark" });
  });

  it.each([
    ["an empty object", {}],
    ["an unknown field", { curency: "usd" }],
    ["an invalid value", { currency: "btc" }],
    ["null", { theme: null }],
    ["an array", ["dark"]],
    ["malformed JSON", "{ theme: dark"],
  ])("rejects %s with 400", async (_, body) => {
    const response = await call("PATCH", "/v1/preferences", { token: await newUser(), body });
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("invalid_request");
  });

  it("names the field that failed in the message", async () => {
    const response = await call("PATCH", "/v1/preferences", { token: await newUser(), body: { currency: "btc" } });
    const { error } = await response.json<{ error: { message: string } }>();
    expect(error.message).toMatch(/^currency: /);
  });

  it("rejects a body that isn't JSON with 415", async () => {
    const response = await call("PATCH", "/v1/preferences", {
      token: await newUser(),
      body: '{"theme":"dark"}',
      headers: { "Content-Type": "text/plain" },
    });
    expect(response.status).toBe(415);
    expect(await errorCode(response)).toBe("unsupported_media_type");
  });

  it("rejects a body over 4 KB with 413", async () => {
    const response = await call("PATCH", "/v1/preferences", {
      token: await newUser(),
      body: { theme: "dark", padding: "x".repeat(5000) },
    });
    expect(response.status).toBe(413);
    expect(await errorCode(response)).toBe("payload_too_large");
  });

  it("falls back to the default for a stored value that is no longer allowed", async () => {
    const token = await newUser();
    const { id } = await (await call("GET", "/v1/user", { token })).json<{ id: string }>();
    await env.DB.prepare("INSERT INTO preferences (user_id, currency, theme, updated_at) VALUES (?, 'jpy', 'dark', ?)")
      .bind(id, new Date().toISOString())
      .run();

    const response = await call("GET", "/v1/preferences", { token });
    expect(await response.json()).toEqual({ currency: "gbp", theme: "dark" });
  });
});

describe("routing", () => {
  it.each(["/", "/v1", "/v1/users", "/v1/watchlist/", "/v1/watchlist/bitcoin/extra"])(
    "returns 404 for %s",
    async (path) => {
      const response = await call("GET", path);
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("not_found");
    },
  );

  it("returns 405 with Allow for a known path and the wrong method", async () => {
    const response = await call("POST", "/v1/watchlist");
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(await errorCode(response)).toBe("method_not_allowed");

    const user = await call("PATCH", "/v1/user");
    expect(user.headers.get("Allow")).toBe("POST, GET, DELETE");
  });
});

describe("headers", () => {
  it("marks every response uncacheable and readable from any origin", async () => {
    const token = await newUser();
    for (const response of [await call("GET", "/v1/watchlist", { token }), await call("GET", "/v1/nope")]) {
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    }
  });

  it("answers CORS preflight requests", async () => {
    const response = await call("OPTIONS", "/v1/watchlist/bitcoin");
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
  });
});

describe("rate limits", () => {
  it("allows 5 new users a minute per IP, then 429 with Retry-After", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 5; i++) {
      expect((await call("POST", "/v1/user", { ip })).status).toBe(201);
    }
    const limited = await call("POST", "/v1/user", { ip });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(await errorCode(limited)).toBe("rate_limited");

    // Another IP is unaffected.
    expect((await call("POST", "/v1/user")).status).toBe(201);
  });

  it("allows 60 requests a minute per user, even from many IPs", async () => {
    const token = await newUser();
    for (let i = 0; i < 60; i++) {
      expect((await call("GET", "/v1/watchlist", { token })).status).toBe(200);
    }
    const limited = await call("GET", "/v1/watchlist", { token });
    expect(limited.status).toBe(429);

    // Another user is unaffected.
    expect((await call("GET", "/v1/watchlist", { token: await newUser() })).status).toBe(200);
  });
});

describe("unexpected failures", () => {
  it("returns 500 without internals and logs the error", async () => {
    const token = await newUser();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(env.DB, "prepare").mockImplementation(() => {
      throw new Error("D1_ERROR: secret table details");
    });

    const response = await call("GET", "/v1/watchlist", { token });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain('"internal"');
    expect(text).not.toContain("secret table details");
    expect(logged).toHaveBeenCalled();
  });
});
