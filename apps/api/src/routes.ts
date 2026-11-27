import type { AuthedContext, RequestContext } from "./context";
import { HttpError } from "./http";
import { getPreferences, updatePreferences } from "./preferences";
import { createUser, deleteUser, getUser } from "./user";
import { addCoin, getWatchlist, removeCoin } from "./watchlist";

// Every route in docs/watchlist-api.md. `auth: false` routes are limited per
// IP; all others need a token and are limited per user (see index.ts).
type Route = { method: string; path: RegExp } & (
  | { auth: false; handler: (ctx: RequestContext) => Promise<Response> }
  | { auth: true; handler: (ctx: AuthedContext) => Promise<Response> }
);

const ROUTES: Route[] = [
  { method: "POST", path: /^\/v1\/user$/, auth: false, handler: createUser },
  { method: "GET", path: /^\/v1\/user$/, auth: true, handler: getUser },
  { method: "DELETE", path: /^\/v1\/user$/, auth: true, handler: deleteUser },
  { method: "GET", path: /^\/v1\/watchlist$/, auth: true, handler: getWatchlist },
  { method: "PUT", path: /^\/v1\/watchlist\/(?<coinId>[^/]+)$/, auth: true, handler: addCoin },
  { method: "DELETE", path: /^\/v1\/watchlist\/(?<coinId>[^/]+)$/, auth: true, handler: removeCoin },
  { method: "GET", path: /^\/v1\/preferences$/, auth: true, handler: getPreferences },
  { method: "PATCH", path: /^\/v1\/preferences$/, auth: true, handler: updatePreferences },
];

// The route for this method and path, or a 404 (unknown path) or 405 (known
// path, wrong method, with the methods it does allow).
export function matchRoute(method: string, pathname: string): { route: Route; params: RequestContext["params"] } {
  const forPath = ROUTES.filter((route) => route.path.test(pathname));
  if (forPath.length === 0) throw new HttpError(404, "not_found", "Unknown route.");

  const route = forPath.find((candidate) => candidate.method === method);
  if (!route) {
    const allowed = forPath.map((candidate) => candidate.method).join(", ");
    throw new HttpError(405, "method_not_allowed", `Use ${allowed}.`, { Allow: allowed });
  }

  return { route, params: route.path.exec(pathname)?.groups ?? {} };
}
