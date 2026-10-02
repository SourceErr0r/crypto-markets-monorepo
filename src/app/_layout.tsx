import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { isRetryable } from "@/api/coingecko-errors";
import { theme } from "@/constants/theme";

// Market data changes slowly, so reuse cached responses for a few minutes.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => failureCount < 1 && isRetryable(error),
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "Market overview" }}
        />
        <Stack.Screen
          name="coin/[id]"
          options={{
            title: "Coin details",
            animation: "slide_from_right",
            gestureEnabled: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
