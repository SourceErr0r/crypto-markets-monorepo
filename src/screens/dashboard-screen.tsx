import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CryptocurrencyRow } from "@/components/cryptocurrency-row";
import { CurrencyMenu } from "@/components/currency-menu";
import type { CurrencyCode } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { useCryptocurrencies } from "@/hooks/use-cryptocurrencies";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [currency, setCurrency] = useState<CurrencyCode>("gbp");
  const { cryptocurrencies, error, isLoading, isRefreshing, refresh } =
    useCryptocurrencies(currency);

  const handleCryptocurrencyPress = (id: string) => {};

  const emptyState = isLoading ? (
    <View style={styles.emptyState}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <Text style={styles.emptyTitle}>Loading market data</Text>
      <Text style={styles.emptyMessage}>
        Fetching the top cryptocurrencies.
      </Text>
    </View>
  ) : error ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Failed to load</Text>
      <Text style={styles.emptyMessage}>{error.message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={refresh}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No cryptocurrencies found</Text>
      <Text style={styles.emptyMessage}>
        Pull down to refresh the market data.
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>CRYPTOCURRENCY</Text>
          <CurrencyMenu currency={currency} onSelect={setCurrency} />
        </View>
        <Text style={styles.title}>Market overview</Text>
        <Text style={styles.subtitle}>
          Top cryptocurrencies by market capitalisation.
        </Text>
        <Text style={styles.listLabel}>TOP 10 BY MARKET CAP</Text>
      </View>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 24 + insets.bottom },
          cryptocurrencies.length === 0 && styles.emptyListContent,
        ]}
        data={cryptocurrencies}
        initialNumToRender={10}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        onRefresh={refresh}
        refreshing={isRefreshing}
        renderItem={({ item }) => (
          <CryptocurrencyRow
            currency={currency}
            item={item}
            onRowPress={handleCryptocurrencyPress}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  list: {
    flex: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 8,
    zIndex: 1,
  },
  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  listLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 24,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  emptyMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    backgroundColor: theme.colors.accentPressed,
  },
});
