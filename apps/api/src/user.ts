import { createToken, hashToken, type User } from "./auth";
import type { AuthedContext, RequestContext } from "./context";
import { jsonResponse, noContent } from "./http";

// `anonymous` is derived, not stored: true while the user has no linked
// identity. There is no identities table yet, so every user is anonymous.
function userBody(user: User) {
  return { id: user.id, createdAt: user.createdAt, anonymous: true };
}

export async function createUser({ env }: RequestContext): Promise<Response> {
  const user: User = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const token = createToken();

  // One batch runs as one transaction: a user is never left without a token.
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, created_at) VALUES (?, ?)").bind(user.id, user.createdAt),
    env.DB.prepare("INSERT INTO tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)").bind(
      await hashToken(token),
      user.id,
      user.createdAt,
    ),
  ]);

  return jsonResponse({ token, user: userBody(user) }, 201);
}

export async function getUser({ user }: AuthedContext): Promise<Response> {
  return jsonResponse(userBody(user));
}

// Foreign keys cascade, so this also deletes the user's tokens, watchlist and
// preferences (tested in schema.test.ts).
export async function deleteUser({ env, user }: AuthedContext): Promise<Response> {
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return noContent();
}
