import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import type { CryptocurrencyDetails } from "@/api/coingecko";
import {
  ActionButton,
  DetailSection,
  MutedText,
  Row,
} from "@/components/coin-details-ui";
import { theme } from "@/constants/theme";
import { descriptionText, webUrl } from "@/utils/coin-details";

export function CoinAbout({ coin }: { coin: CryptocurrencyDetails }) {
  const [expanded, setExpanded] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const description = descriptionText(coin.description.en);
  const homepage = coin.links.homepage.map(webUrl).find(Boolean);
  const whitepaper = webUrl(coin.links.whitepaper);
  const links = [
    { label: "Website ↗", url: homepage },
    { label: "Whitepaper ↗", url: whitepaper },
  ];

  async function openLink(url: string) {
    setLinkError(null);
    try {
      await openBrowserAsync(url);
    } catch {
      setLinkError("Unable to open this link. Please try again.");
    }
  }

  return (
    <DetailSection title={`About ${coin.name}`}>
      <Text selectable style={styles.description}>
        {description
          ? !expanded && description.length > 320
            ? `${description.slice(0, 320).trimEnd()}…`
            : description
          : "No description is available for this coin."}
      </Text>
      {description.length > 320 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={styles.expand}
        >
          <Text style={styles.link}>
            {expanded ? "Show less" : "Read more"}
          </Text>
        </Pressable>
      )}
      <Row>
        {links.map(
          ({ label, url }) =>
            url && (
              <ActionButton
                key={label}
                label={label}
                accessibilityRole="link"
                onPress={() => void openLink(url)}
              />
            ),
        )}
      </Row>
      {linkError && (
        <MutedText accessibilityRole="alert">{linkError}</MutedText>
      )}
    </DetailSection>
  );
}

const styles = StyleSheet.create({
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  expand: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: theme.colors.accent, fontSize: 15, fontWeight: "600" },
});
