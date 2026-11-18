import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCryptocurrencyDetails } from "@crypto-markets/api";

import { CoinAbout } from "@/components/coin-about";
import { LoadState, MutedText } from "@/components/coin-details-ui";
import { CoinHero } from "@/components/coin-hero";
import {
  AllTimePrices,
  DayRange,
  MarketOverview,
  Supply,
} from "@/components/coin-market-sections";
import CoinPriceHistory from "@/components/coin-price-history";
import {
  currencies,
  currencyCodes,
  type CurrencyCode,
} from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { formatDate } from "@/utils/coin-details";

export default function CryptocurrencyDetailsScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    currency?: string;
  }>();
  const { id, name } = params;
  const currency =
    currencyCodes.find((code) => code === params.currency) ?? currencyCodes[0];

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <Stack.Screen options={{ title: name || id || "Coin details" }} />
      {id ? (
        <CoinDetails key={id} id={id} currency={currency} />
      ) : (
        <MutedText>No coin selected.</MutedText>
      )}
    </SafeAreaView>
  );
}

function CoinDetails({ id, currency }: { id: string; currency: CurrencyCode }) {
  const { data: coin, error, retry } = useCryptocurrencyDetails(id, currency);
  if (!coin)
    return (
      <LoadState error={error} retry={retry} label="Loading coin details…" />
    );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <CoinHero coin={coin} currency={currency} />
      <CoinPriceHistory id={id} currency={currency} />
      <MarketOverview coin={coin} currency={currency} />
      <DayRange coin={coin} currency={currency} />
      <Supply coin={coin} />
      <AllTimePrices coin={coin} currency={currency} />
      <CoinAbout coin={coin} />
      <Text style={styles.footer}>
        Data from CoinGecko · {currencies[currency].code}
        {coin.last_updated ? `\nUpdated ${formatDate(coin.last_updated)}` : ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, gap: 20 },
  footer: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 20,
    paddingBottom: 8,
  },
});
