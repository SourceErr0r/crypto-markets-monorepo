import { Image, StyleSheet, Text, View } from "react-native";
import type { CryptocurrencyDetails } from "@crypto-markets/api";

import { ChangeBadge, MutedText, Row } from "@/components/coin-details-ui";
import { currencies, type CurrencyCode } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { formatPrice } from "@/utils/formatters";

type CoinHeroProps = { coin: CryptocurrencyDetails; currency: CurrencyCode };

export function CoinHero({ coin, currency }: CoinHeroProps) {
  const market = coin.market_data;
  const image = coin.image.large || coin.image.small;

  return (
    <View style={styles.hero}>
      <View style={styles.identity}>
        {image ? (
          <Image
            source={{ uri: image }}
            accessibilityLabel={`${coin.name} logo`}
            style={styles.logo}
          />
        ) : null}
        <View style={styles.identityText}>
          <Text accessibilityRole="header" style={styles.name}>
            {coin.name}
          </Text>
          <MutedText>
            {coin.symbol.toUpperCase()} ·{" "}
            {coin.market_cap_rank ? `Rank #${coin.market_cap_rank}` : "Unranked"}
          </MutedText>
        </View>
      </View>
      <MutedText>
        CURRENT PRICE · {currencies[currency].code}
      </MutedText>
      <Text selectable style={styles.price}>
        {formatPrice(market.current_price[currency] ?? null, currency)}
      </Text>
      <Row>
        <ChangeBadge
          label="24 hours"
          value={market.price_change_percentage_24h_in_currency[currency]}
        />
        <ChangeBadge
          label="7 days"
          value={market.price_change_percentage_7d_in_currency[currency]}
        />
        <ChangeBadge
          label="30 days"
          value={market.price_change_percentage_30d_in_currency[currency]}
        />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, paddingBottom: 4 },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  identityText: { flex: 1, gap: 4 },
  logo: { height: 48, width: 48 },
  name: { color: theme.colors.text, fontSize: 26, fontWeight: "700" },
  price: {
    color: theme.colors.text,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1,
  },
});
