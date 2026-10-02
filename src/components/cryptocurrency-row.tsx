import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from "react-native";

import type { Cryptocurrency } from "@/api/coingecko";
import type { CurrencyCode } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { formatMarketCap, formatPrice } from "@/utils/formatters";

type CryptocurrencyRowProps = {
  item: Cryptocurrency;
  currency: CurrencyCode;
  onRowPress: (id: string) => void;
};

type CryptoCyrrencyRendererProps = {
  currency: CurrencyCode;
  handleCryptocurrencyPress: (id: string) => void;
};

export function CryptocurrencyRow({
  item,
  currency,
  onRowPress,
}: CryptocurrencyRowProps) {
  const handleOnPress = () => onRowPress(item.id);

  return (
    <TouchableOpacity style={styles.row} onPress={handleOnPress}>
      <Text style={styles.rank}>{item.market_cap_rank ?? "—"}</Text>
      <Image
        accessibilityLabel={`${item.name} logo`}
        source={{ uri: item.image }}
        style={styles.coinImage}
      />
      <View style={styles.coinDetails}>
        <Text numberOfLines={1} style={styles.coinName}>
          {item.name}
        </Text>
        <Text style={styles.symbol}>{item.symbol.toUpperCase()}</Text>
      </View>
      <View style={styles.priceDetails}>
        <Text style={styles.price}>
          {formatPrice(item.current_price, currency)}
        </Text>
        <Text numberOfLines={1} style={styles.marketCap}>
          {formatMarketCap(item.market_cap, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function createCryptocurrencyRenderer({
  currency,
  handleCryptocurrencyPress,
}: CryptoCyrrencyRendererProps) {
  return function renderCryptocurrency({
    item,
  }: ListRenderItemInfo<Cryptocurrency>) {
    return (
      <CryptocurrencyRow
        item={item}
        currency={currency}
        onRowPress={handleCryptocurrencyPress}
      />
    );
  };
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    minHeight: 76,
    paddingHorizontal: 12,
  },
  rank: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    width: 28,
  },
  coinImage: {
    height: 40,
    marginLeft: 8,
    width: 40,
  },
  coinDetails: {
    flex: 1,
    marginLeft: 12,
  },
  coinName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  symbol: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  priceDetails: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  price: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  marketCap: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    maxWidth: 120,
  },
});
