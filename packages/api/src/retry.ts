import { ApiError, isRetryable } from "./errors";

// Retry policy for TanStack Query's `retry` and `retryDelay` options. Shared
// here so every app (mobile, web) backs off the same way. TanStack passes
// failureCount = 0 after the first failure.

// Transient failures get two more attempts: enough to ride out a blip without
// keeping the user waiting or spending much of the shared rate limit.
export const MAX_RETRIES = 2;

// When the server says when to come back, wait that long only if it's short.
// The proxy's per-IP limit asks for 60 s: better to show "try again in 60 s"
// than to leave a spinner running for a minute.
export const MAX_RETRY_AFTER_SECONDS = 10;

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

export function shouldRetry(failureCount: number, error: unknown) {
  if (!(error instanceof ApiError)) return false;

  // Retry-After (429, 503) overrides the usual rules: one retry, once the
  // server's wait is over, and only if that wait is short.
  if (error.retryAfterSeconds !== undefined) {
    return (
      failureCount < 1 && error.retryAfterSeconds <= MAX_RETRY_AFTER_SECONDS
    );
  }

  return failureCount < MAX_RETRIES && isRetryable(error);
}

export function retryDelay(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.retryAfterSeconds !== undefined) {
    return error.retryAfterSeconds * 1000;
  }

  // Exponential backoff (1 s, 2 s, 4 s… capped), with jitter so clients that
  // failed together don't all retry in the same instant.
  const backoff = Math.min(BASE_DELAY_MS * 2 ** failureCount, MAX_DELAY_MS);
  return backoff * (0.5 + Math.random() * 0.5);
}
