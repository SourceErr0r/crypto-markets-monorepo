// Response helpers. Every response, success or error, is uncacheable (it is
// one user's data) and carries the same CORS headers.

// Any origin may call the API: the token travels in a header, not a cookie, so
// another site's page can't make a browser send it (no CSRF). Narrowed to the
// web app's domain at deploy. Expose-Headers lets browser code read headers
// that aren't CORS-safelisted.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Retry-After, WWW-Authenticate",
};

const BASE_HEADERS = { ...CORS_HEADERS, "Cache-Control": "no-store" };

export type ErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "not_found"
  | "method_not_allowed"
  | "watchlist_full"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "internal";

// Thrown anywhere in a request and turned into an error response in index.ts,
// so helpers (auth, body parsing) can stop a request without every caller
// checking a result.
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

// Error body format, the same as the API proxy's:
// { "error": { "code": "...", "message": "..." } }. `code` is stable for
// clients to branch on; `message` is for developers.
export function errorResponse(error: HttpError): Response {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status, headers: { ...BASE_HEADERS, ...error.headers } },
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: BASE_HEADERS });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: BASE_HEADERS });
}

// Browsers ask before sending Authorization or a JSON body cross-origin.
// Max-Age lets them remember the answer for a day instead of asking each time.
export function preflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Turns schema issues (zod's `error.issues`) into a 400. Typed by shape so
// this Worker doesn't import zod itself.
export function invalidRequest(issues: readonly { path: readonly PropertyKey[]; message: string }[]): HttpError {
  const [issue] = issues;
  const where = issue && issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
  return new HttpError(400, "invalid_request", where + (issue?.message ?? "Invalid request."));
}
