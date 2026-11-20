import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCryptocurrencySearch,
  type CryptocurrencySearchResult,
} from "@crypto-markets/api";

import { SearchResultRow } from "@/components/search-result-row";
import { StateMessage } from "@/components/state-message";
import { currencyCodes } from "@/constants/currencies";
import { theme } from "@/constants/theme";

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
    <StateMessage loading />
  ) : error ? (
    <StateMessage title="Search failed" message={error.message} onRetry={retry} />
  ) : hasTerm ? (
    <StateMessage
      title="No results"
      message={`Nothing matched “${query.trim()}”. Try a different name or symbol.`}
    />
  ) : (
    <StateMessage
      title="Search cryptocurrencies"
      message="Enter a name or symbol, such as Bitcoin or ETH."
    />
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
});
