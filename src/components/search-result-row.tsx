import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { CryptocurrencySearchResult } from "@/api/coingecko";
import { theme } from "@/constants/theme";

type SearchResultRowProps = {
  item: CryptocurrencySearchResult;
  onPress: (item: CryptocurrencySearchResult) => void;
};

export function SearchResultRow({ item, onPress }: SearchResultRowProps) {
  return (
    <Pressable
      accessibilityLabel={`View ${item.name} details`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {item.thumb ? (
        <Image source={{ uri: item.thumb }} style={styles.thumb} />
      ) : (
        // Keep the row aligned when a coin has no logo.
        <View style={styles.thumb} />
      )}
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.symbol}>{item.symbol.toUpperCase()}</Text>
      </View>
      {item.market_cap_rank !== null && (
        <Text style={styles.rank}>#{item.market_cap_rank}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    minHeight: 60,
    paddingHorizontal: 12,
  },
  rowPressed: {
    backgroundColor: theme.colors.surface,
  },
  thumb: {
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  symbol: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  rank: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 12,
  },
});
