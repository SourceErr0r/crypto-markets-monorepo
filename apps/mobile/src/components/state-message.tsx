import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants/theme";

type StateMessageProps = {
  title?: string;
  message?: string;
  // Shows a spinner above the text, for loading states.
  loading?: boolean;
  // Shows a "Try again" button, for error states.
  onRetry?: () => void;
};

// Full-area message used as a FlatList empty state: loading, error or empty.
export function StateMessage({
  title,
  message,
  loading,
  onRetry,
}: StateMessageProps) {
  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color={theme.colors.accent} size="large" />}
      {title && <Text style={styles.title}>{title}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pressed: {
    backgroundColor: theme.colors.accentPressed,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
