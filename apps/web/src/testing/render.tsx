import { ApiClientProvider, createApiClient } from "@crypto-markets/api";
import { TEST_BASE_URL } from "@crypto-markets/api/testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

// Renders a component with the same providers as the app (see
// app/providers.tsx), pointed at the MSW mock proxy. A fresh QueryClient per
// test so nothing is cached between tests, and no retries so error states
// show at once instead of after the real backoff.
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const result = render(
    <ApiClientProvider client={createApiClient(TEST_BASE_URL)}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ApiClientProvider>,
  );

  return { ...result, queryClient, user: userEvent.setup() };
}
