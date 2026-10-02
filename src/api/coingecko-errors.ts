// Maps CoinGecko failures to messages that are safe to show to users.
// Status and error codes: https://docs.coingecko.com/docs/errors-and-rate-limits

export const NETWORK_ERROR_MESSAGE =
  "Can't reach CoinGecko. Check your internet connection and try again.";
export const INVALID_RESPONSE_MESSAGE =
  "CoinGecko returned data we couldn't read. Please try again.";
export const UNKNOWN_ERROR_MESSAGE =
  "Something went wrong loading market data. Please try again.";

const KEY_PROBLEM_MESSAGE =
  "The app couldn't authenticate with CoinGecko. Please check your key and try again.";
const UNAVAILABLE_MESSAGE =
  "CoinGecko is temporarily unavailable. Please try again shortly.";

// CoinGecko's own error codes, returned in the response body. These are more
// specific than the HTTP status, so they take precedence.
const CODE_MESSAGES: Record<number, string> = {
  10002: KEY_PROBLEM_MESSAGE, // No API key provided
  10005: "This data isn't available with the current CoinGecko plan.",
  10010: KEY_PROBLEM_MESSAGE, // Pro key used against the Demo URL
  10011: KEY_PROBLEM_MESSAGE, // Demo key used against the Pro URL
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "That request wasn't valid. Please try again.",
  401: KEY_PROBLEM_MESSAGE,
  403: "Access to market data was blocked. Please try again later.",
  404: "We couldn't find that cryptocurrency.",
  408: "The request took too long. Check your connection and try again.",
  429: "Too many requests. Please wait a few minutes and try again.",
  500: "CoinGecko is having problems right now. Please try again shortly.",
  502: UNAVAILABLE_MESSAGE,
  503: UNAVAILABLE_MESSAGE,
  504: UNAVAILABLE_MESSAGE,
};

type ErrorDetails = { status?: number; code?: number; cause?: unknown };

// Carries a user-friendly message. The raw status and code stay available for
// debugging without being shown in the UI.
export class CoinGeckoError extends Error {
  readonly status?: number;
  readonly code?: number;

  constructor(message: string, { status, code, cause }: ErrorDetails = {}) {
    super(message, { cause });
    this.name = "CoinGeckoError";
    this.status = status;
    this.code = code;
  }
}

export function httpErrorMessage(status: number, code?: number) {
  return (
    (code !== undefined ? CODE_MESSAGES[code] : undefined) ??
    STATUS_MESSAGES[status] ??
    // Other server errors are not the user's fault, so say so.
    (status >= 500 ? STATUS_MESSAGES[500] : UNKNOWN_ERROR_MESSAGE)
  );
}

// Only failures that could be transient are worth retrying. Client errors such
// as 429 or 404 won't change on a second attempt, and failed calls still count
// toward CoinGecko's rate limit.
export function isRetryable(error: unknown) {
  if (!(error instanceof CoinGeckoError) || error.status === undefined) {
    return true;
  }
  return error.status === 408 || error.status >= 500;
}

export function invalidResponseError() {
  return new CoinGeckoError(INVALID_RESPONSE_MESSAGE);
}

// The only way errors should reach the UI: raw messages never leak through.
export function getErrorMessage(error: unknown) {
  return error instanceof CoinGeckoError
    ? error.message
    : UNKNOWN_ERROR_MESSAGE;
}
