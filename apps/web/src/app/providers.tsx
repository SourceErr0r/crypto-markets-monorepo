"use client";

import {
  ApiClientProvider,
  createApiClient,
  retryDelay,
  shouldRetry,
} from "@crypto-markets/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// The browser talks to our API proxy (apps/proxy), which holds the CoinGecko
// key. Not a secret: NEXT_PUBLIC_* values are inlined into the bundle at build
// time. Without it, use `pnpm proxy` (wrangler dev) on this machine.
const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787",
);

function createQueryClient() {
  // Same defaults as mobile: each query sets its own staleTime (this is the
  // fallback), and the retry policy comes from the shared API package.
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: shouldRetry,
        retryDelay,
      },
    },
  });
}

// Client components still render once on the server. A module-level
// QueryClient would be one cache shared by every request there, so create it
// per mount instead; useState keeps the same instance across re-renders.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ApiClientProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiClientProvider>
  );
}
