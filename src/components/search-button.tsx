import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { theme } from "@/constants/theme";

type SearchButtonProps = {
  onPress: () => void;
};

export function SearchButton({ onPress }: SearchButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Search cryptocurrencies"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <SymbolView
        name={{ ios: "magnifyingglass", android: "search", web: "search" }}
        size={16}
        tintColor={theme.colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    // Match the currency button's height so the two align.
    minHeight: 36,
    minWidth: 40,
  },
  buttonPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
});
