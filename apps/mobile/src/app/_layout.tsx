import {
  ApiClientProvider,
  createApiClient,
  retryDelay,
  shouldRetry,
} from "@crypto-markets/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

import { theme } from "@/constants/theme";

// The app talks to our API proxy (apps/proxy), which holds the CoinGecko key.
// Not a secret: EXPO_PUBLIC_* values are inlined into the bundle.
// Without it, use `wrangler dev` on this machine. The Android emulator reaches
// the host at 10.0.2.2, not localhost, so iOS and Android can run side by side.
const LOCAL_PROXY_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";
const apiClient = createApiClient(
  process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_PROXY_URL,
);

// Each query in @crypto-markets/api sets its own staleTime; this is the
// fallback for any query that doesn't. The retry policy lives in the API
// package so every app backs off the same way.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: shouldRetry,
      retryDelay,
    },
  },
});

export default function RootLayout() {
  return (
    <ApiClientProvider client={apiClient}>
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
          <Stack.Screen
            name="search"
            options={{
              headerShown: false,
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </QueryClientProvider>
    </ApiClientProvider>
  );
}
