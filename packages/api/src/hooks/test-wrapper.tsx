import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { ApiClient } from "../client";
import { ApiClientProvider } from "../client-context";

// A fresh QueryClient per test avoids cache leaking between tests. Retries are
// off so failures surface immediately, and garbage collection timers are
// disabled so they cannot keep the test run alive.
export function createWrapper(api: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ApiClientProvider client={api}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ApiClientProvider>
    );
  };
}
