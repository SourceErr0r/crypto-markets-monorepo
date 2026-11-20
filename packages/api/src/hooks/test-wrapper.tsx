import {
  QueryClient,
  QueryClientProvider,
  type QueryObserverOptions,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { ApiClient } from "../client";
import { ApiClientProvider } from "../client-context";

type RetryOptions = Pick<QueryObserverOptions, "retry" | "retryDelay">;

// A fresh QueryClient per test avoids cache leaking between tests. Retries are
// off unless a test passes a policy, so failures surface immediately, and
// garbage collection timers are disabled so they cannot keep the run alive.
export function createWrapper(
  api: ApiClient,
  retryOptions: RetryOptions = { retry: false },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { ...retryOptions, gcTime: Infinity } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ApiClientProvider client={api}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ApiClientProvider>
    );
  };
}
