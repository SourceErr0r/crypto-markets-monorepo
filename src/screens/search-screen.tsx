import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CryptocurrencySearchResult } from "@/api/coingecko";
import { SearchResultRow } from "@/components/search-result-row";
import { currencyCodes } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { useCryptocurrencySearch } from "@/hooks/use-cryptocurrency-search";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ currency?: string }>();
  const currency =
    currencyCodes.find((code) => code === params.currency) ?? currencyCodes[0];
  const [query, setQuery] = useState("");
  const { hasTerm, results, error, isLoading, retry } =
    useCryptocurrencySearch(query);

  const handleResultPress = ({ id, name }: CryptocurrencySearchResult) => {
    // Replace the search modal so details open in the main stack rather than
    // stacking a second screen on top of the modal.
    router.replace({ pathname: "/coin/[id]", params: { id, currency, name } });
  };

  const emptyState = isLoading ? (
    <View style={styles.emptyState}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
    </View>
  ) : error ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Search failed</Text>
      <Text style={styles.emptyMessage}>{error}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.retryButtonPressed,
        ]}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : hasTerm ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No results</Text>
      <Text style={styles.emptyMessage}>
        Nothing matched “{query.trim()}”. Try a different name or symbol.
      </Text>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Search cryptocurrencies</Text>
      <Text style={styles.emptyMessage}>
        Enter a name or symbol, such as Bitcoin or ETH.
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.searchBar}>
        <View style={styles.inputWrapper}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={16}
            tintColor={theme.colors.textSecondary}
          />
          <TextInput
            accessibilityLabel="Search cryptocurrencies"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Name or symbol"
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          results.length === 0 && styles.emptyListContent,
        ]}
        data={isLoading || error ? [] : results}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        renderItem={({ item }) => (
          <SearchResultRow item={item} onPress={handleResultPress} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  searchBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 44,
  },
  cancel: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
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
  retryButtonPressed: {
    backgroundColor: theme.colors.accentPressed,
  },
  retryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
