import type { DisplayError } from "@crypto-markets/api";

import { formatTime } from "@/utils/formatters";

// "45 s", "2 min": how long the server asked us to wait.
export function formatWait(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}

// Toast text for a refresh that failed while older data is still on screen.
// Short, because it sits in a small pill: what happened, then what the user
// is looking at or can do.
export function refreshErrorMessage(
  error: DisplayError,
  updatedAt: number | null,
) {
  if (error.retryAfterSeconds) {
    return `Couldn't refresh · try again in ${formatWait(error.retryAfterSeconds)}`;
  }

  const problem = error.kind === "offline" ? "Can't connect" : "Couldn't refresh";
  return updatedAt === null
    ? problem
    : `${problem} · showing prices from ${formatTime(updatedAt)}`;
}
