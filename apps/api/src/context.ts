import type { User } from "./auth";

// What a route handler receives. `params` holds the named groups from the
// route's path pattern (e.g. coinId).
export type RequestContext = {
  request: Request;
  env: Env;
  params: Record<string, string | undefined>;
};

export type AuthedContext = RequestContext & { user: User };
