import type { DisplayError } from "@crypto-markets/api";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
} from "react-native";

import { theme } from "@/constants/theme";
import { formatDecimal } from "@/utils/formatters";

export function MutedText(props: TextProps) {
  return <Text {...props} style={[styles.muted, props.style]} />;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function ActionButton({
  label,
  onPress,
  accessibilityRole = "button",
}: {
  label: string;
  onPress: () => void;
  accessibilityRole?: "button" | "link";
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
      {caption && <Text style={styles.muted}>{caption}</Text>}
    </View>
  );
}

export function ChangeBadge({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const color =
    value == null
      ? theme.colors.textSecondary
      : value < 0
        ? theme.colors.negative
        : theme.colors.positive;
  return (
    <View style={styles.badge}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.change, { color }]}>
        {value == null
          ? "—"
          : `${value > 0 ? "+" : ""}${formatDecimal(value, 2)}%`}
      </Text>
    </View>
  );
}

export function RangeBar({
  percentage,
  label,
}: {
  percentage: number;
  label: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percentage}%` }]} />
    </View>
  );
}

export function LoadState({
  error,
  retry,
  label,
}: {
  error: DisplayError | null;
  retry: () => void;
  label: string;
}) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      {!error && <ActivityIndicator color={theme.colors.accent} />}
      <MutedText>{error?.message ?? label}</MutedText>
      {error && <ActionButton label="Try again" onPress={retry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  heading: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  muted: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  stat: { flexGrow: 1, flexBasis: "40%", gap: 4 },
  value: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  badge: {
    flexGrow: 1,
    flexBasis: 75,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  change: { fontSize: 16, fontWeight: "600" },
  track: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  state: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 12,
    gap: 16,
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
  },
  buttonText: { color: theme.colors.text, fontWeight: "600", fontSize: 14 },
});
