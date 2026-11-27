import type { DisplayError } from "@crypto-markets/api";
import type { ReactNode } from "react";

// Full-area messages for when there's nothing else to show, plus a small
// notice for when a refresh failed but older data is still on screen.
// Error text always comes from DisplayError, which is safe to show as-is.

export function Loading({ children }: { children: ReactNode }) {
  return (
    <p className="status" role="status" aria-busy="true">
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="status">{children}</p>;
}

export function ErrorMessage({
  error,
  onRetry,
}: {
  error: DisplayError;
  onRetry: () => void;
}) {
  return (
    <div className="status" role="alert">
      <p>{error.message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

// Never hide data we have: the list stays and this explains it may be old.
export function RefreshFailedNotice({ error }: { error: DisplayError }) {
  return (
    <p className="notice" role="status">
      Couldn&apos;t refresh, showing the last data we loaded. {error.message}
    </p>
  );
}
