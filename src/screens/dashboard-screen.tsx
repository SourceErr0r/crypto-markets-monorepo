import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CryptocurrencyRow } from "@/components/cryptocurrency-row";
import { CurrencyMenu } from "@/components/currency-menu";
import { SearchButton } from "@/components/search-button";
import { StateMessage } from "@/components/state-message";
import type { CurrencyCode } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { useCryptocurrencies } from "@/hooks/use-cryptocurrencies";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [currency, setCurrency] = useState<CurrencyCode>("gbp");
  const { cryptocurrencies, error, isLoading, isRefreshing, refresh } =
    useCryptocurrencies(currency);

  const handleCryptocurrencyPress = (id: string) => {
    const coin = cryptocurrencies.find((item) => item.id === id);

    router.push({
      pathname: "/coin/[id]",
      params: { id, currency, name: coin?.name ?? id },
    });
  };

  const handleSearchPress = () => {
    router.push({ pathname: "/search", params: { currency } });
  };

  const emptyState = isLoading ? (
    <StateMessage
      loading
      title="Loading market data"
      message="Fetching the top cryptocurrencies."
    />
  ) : error ? (
    <StateMessage title="Failed to load" message={error} onRetry={refresh} />
  ) : (
    <StateMessage
      title="No cryptocurrencies found"
      message="Pull down to refresh the market data."
    />
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>CRYPTOCURRENCY</Text>
          <View style={styles.headerActions}>
            <SearchButton onPress={handleSearchPress} />
            <CurrencyMenu currency={currency} onSelect={setCurrency} />
          </View>
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
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
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
});
