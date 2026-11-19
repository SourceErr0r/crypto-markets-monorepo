// Maps API proxy failures to messages that are safe to show to users.
// The proxy's error format and codes: apps/proxy/src/http.ts

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your internet connection and try again.";
export const INVALID_RESPONSE_MESSAGE =
  "We received data we couldn't read. Please try again.";
export const TIMEOUT_MESSAGE =
  "The request took too long. Check your connection and try again.";
export const UNKNOWN_ERROR_MESSAGE =
  "Something went wrong loading market data. Please try again.";

const UNAVAILABLE_MESSAGE =
  "Market data is temporarily unavailable. Please try again shortly.";

// The proxy hides upstream problems behind 502/503, so the status alone
// picks the message. Its `code` is kept on the error for debugging.
const STATUS_MESSAGES: Record<number, string> = {
  400: "That request wasn't valid. Please try again.",
  404: "We couldn't find that cryptocurrency.",
  408: TIMEOUT_MESSAGE,
  429: "Too many requests. Please wait a minute and try again.",
  500: UNAVAILABLE_MESSAGE,
  502: UNAVAILABLE_MESSAGE,
  503: "Market data is busy right now. Please try again in a minute.",
  504: UNAVAILABLE_MESSAGE,
};

// The proxy's error body: { "error": { "code": "...", "message": "..." } }.
export type ApiErrorResponse = {
  error?: { code?: string; message?: string };
};

// What went wrong, so callers can decide what to do without parsing messages:
// - network: no response at all (offline, DNS, connection reset)
// - timeout: no complete response within the client's time limit
// - http: the proxy answered with an error status
// - invalid-response: a 2xx whose body wasn't JSON or didn't match the schema
export type ApiErrorKind = "network" | "timeout" | "http" | "invalid-response";

type ErrorDetails =
  | { kind: "network" | "timeout" | "invalid-response"; cause?: unknown }
  | { kind: "http"; status: number; code?: string; retryAfterSeconds?: number };

// Carries a user-friendly message. The kind, status and code stay available
// for retry decisions and debugging without being shown in the UI.
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  // From the Retry-After header: how long the server asked us to wait.
  readonly retryAfterSeconds?: number;

  constructor(message: string, details: ErrorDetails) {
    super(message, { cause: "cause" in details ? details.cause : undefined });
    this.name = "ApiError";
    this.kind = details.kind;
    if (details.kind === "http") {
      this.status = details.status;
      this.code = details.code;
      this.retryAfterSeconds = details.retryAfterSeconds;
    }
  }
}

export function httpErrorMessage(status: number) {
  return (
    STATUS_MESSAGES[status] ??
    // Other server errors are not the user's fault, so say so.
    (status >= 500 ? UNAVAILABLE_MESSAGE : UNKNOWN_ERROR_MESSAGE)
  );
}

// Retry-After is either seconds or an HTTP date. The proxy only sends seconds,
// so anything else (missing, a date, garbage) is treated as "no advice".
export function parseRetryAfter(header: string | null) {
  if (header === null || !/^\d+$/.test(header.trim())) return undefined;
  return Number(header.trim());
}

// Only failures that could be transient are worth retrying: no response, a
// timeout, or a server error. Client errors such as 429 or 404 won't change on
// an immediate second attempt, and failed calls still count toward the rate
// limit. A body that fails validation, or a bug in our own code, will fail the
// same way again. Errors carrying Retry-After are handled in retry.ts.
export function isRetryable(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === "network" || error.kind === "timeout") return true;
  if (error.kind === "http") {
    return error.status === 408 || (error.status ?? 0) >= 500;
  }
  return false;
}

// The only way errors should reach the UI: raw messages never leak through.
export function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : UNKNOWN_ERROR_MESSAGE;
}
