import { createContext, useContext, type ReactNode } from "react";

import type { ApiClient } from "./client";

// Hooks get the client from context, like TanStack Query's QueryClient, so
// each app (and each test) decides which API it talks to.
const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used inside an ApiClientProvider");
  }
  return client;
}
