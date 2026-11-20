import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

const FADE_MS = 200;
export const TOAST_VISIBLE_MS = 4000;

// A small message that floats above the bottom of the screen, then fades out.
// Mount it with a new `key` for each event so it shows once per event:
//   {error && <Toast key={errorUpdatedAt} message={...} />}
// It never takes taps, so the content underneath stays usable.
export function Toast({ message }: { message: string }) {
  const insets = useSafeAreaInsets();
  // Created once and kept for the toast's lifetime.
  const [opacity] = useState(() => new Animated.Value(0));
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Android and web announce it through aria-live below. iOS has no live
    // regions, so ask VoiceOver to read it.
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(message);
    }

    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      Animated.delay(TOAST_VISIBLE_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    // Remove it once faded, so screen readers can't land on an invisible toast.
    animation.start(({ finished }) => finished && setIsHidden(true));
    return () => animation.stop();
  }, [message, opacity]);

  if (isHidden) return null;

  return (
    <Animated.View
      aria-live="polite"
      pointerEvents="none"
      style={[styles.container, { bottom: insets.bottom + 16, opacity }]}
    >
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Full width so the pill can centre itself and wrap long text.
  container: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: 24,
    position: "absolute",
    right: 0,
  },
  pill: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    textAlign: "center",
  },
});
