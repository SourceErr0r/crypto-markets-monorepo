import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";

import type { HistoryDays, PriceHistoryPoint } from "@/api/coingecko.types";
import {
  DetailSection,
  LoadState,
  MutedText,
} from "@/components/coin-details-ui";
import type { CurrencyCode } from "@/constants/currencies";
import { currencies } from "@/constants/currencies";
import { LOCALE } from "@/constants/locale";
import { theme } from "@/constants/theme";
import { usePriceHistory } from "@/hooks/use-price-history";
import {
  priceChartData,
  timeLabel,
  type ChartPricePoint,
} from "@/utils/price-chart";

export type CoinPriceHistoryProps = { id: string; currency: CurrencyCode };

const CHART_HEIGHT = 220;

export default function CoinPriceHistory({
  id,
  currency,
}: CoinPriceHistoryProps) {
  const [days, setDays] = useState<HistoryDays>(7);
  const { history, error, isLoading, isEmpty, retry } = usePriceHistory(
    id,
    currency,
    days,
  );
  const { fontScale } = useWindowDimensions();
  const labelScale = Math.max(1, fontScale);
  // Use identical dimensions for the plot and every loading/error state.
  const contentHeight = CHART_HEIGHT + 32 * labelScale;
  return (
    <DetailSection title="Price history">
      <View style={styles.tabs}>
        {([1, 7, 30] as const).map((range) => (
          <Pressable
            key={range}
            accessibilityRole="button"
            accessibilityLabel={`${range} day price history`}
            accessibilityState={{ selected: days === range }}
            onPress={() => setDays(range)}
            style={[styles.tab, days === range && styles.selected]}
          >
            <Text style={styles.tabLabel}>{range}D</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.chartContainer, { height: contentHeight }]}>
        {history ? (
          <HistoryChart
            currency={currency}
            days={history.days}
            points={history.points}
            labelScale={labelScale}
          />
        ) : isEmpty ? (
          <MutedText>
            Not enough price history is available for this period.
          </MutedText>
        ) : (
          <LoadState
            error={error}
            retry={retry}
            label="Loading price history…"
          />
        )}
      </View>
      {history && isLoading && (
        <View style={styles.updateStatus} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.accent} />
          <MutedText style={styles.statusText}>
            {`Loading ${days}D… Showing ${history.days}D.`}
          </MutedText>
        </View>
      )}
    </DetailSection>
  );
}

function HistoryChart({
  currency,
  days,
  points,
  labelScale,
}: {
  currency: CoinPriceHistoryProps["currency"];
  days: HistoryDays;
  points: PriceHistoryPoint[];
  labelScale: number;
}) {
  const [width, setWidth] = useState(0);
  const chart = useMemo(
    () => priceChartData(points, currency),
    [points, currency],
  );
  const first = points[0];
  const last = points[points.length - 1];
  const labelWidth = Math.min(
    width * 0.45,
    Math.max(...chart.labels.map((label) => label.length)) * 7 * labelScale + 8,
  );
  const plotWidth = Math.max(1, width - labelWidth - 16);
  const summary = `${days} day price history in ${currencies[currency].code}. Starting price ${chart.formatPrice(first[1])}. Ending price ${chart.formatPrice(last[1])}. Times shown in your local time zone.`;

  return (
    <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        {width > 0 && (
          <LineChart
            key={`${currency}-${days}-${width}-${labelScale}`}
            data={chart.data}
            width={plotWidth}
            height={CHART_HEIGHT - 24}
            xOffset={first[0]}
            xScale={(plotWidth - 8) / Math.max(1, last[0] - first[0])}
            initialSpacing={4}
            endSpacing={0}
            spacing={0}
            maxValue={100}
            noOfSections={2}
            stepValue={50}
            yAxisLabelTexts={chart.labels}
            yAxisLabelWidth={labelWidth}
            yAxisTextStyle={styles.axisLabel}
            yAxisTextNumberOfLines={1}
            // Gifted Charts defaults to raw timestamps; dates are rendered below.
            xAxisLabelTextStyle={styles.hiddenAxisLabel}
            xAxisLabelsHeight={0}
            xAxisThickness={0}
            yAxisThickness={0}
            rulesColor={theme.colors.border}
            color={theme.colors.accent}
            thickness={2}
            hideDataPoints
            disableScroll
            pointerConfig={{
              activatePointersOnLongPress: true,
              autoAdjustPointerLabelPosition: true,
              pointerColor: theme.colors.accent,
              pointerStripColor: theme.colors.textSecondary,
              pointerLabelWidth: Math.min(180, width),
              pointerLabelHeight: 64 * labelScale,
              pointerLabelComponent: (items: ChartPricePoint[]) => {
                const point = items[0];
                return point ? (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipPrice}>
                      {chart.formatPrice(point.price)}
                    </Text>
                    <Text style={styles.axisLabel}>
                      {new Date(point.x).toLocaleString(LOCALE)}
                    </Text>
                  </View>
                ) : null;
              },
            }}
          />
        )}
        <View
          style={[
            styles.timeLabels,
            { marginLeft: labelWidth + 4, marginRight: 16 },
          ]}
        >
          <Text style={styles.axisLabel}>{timeLabel(first[0], days)}</Text>
          <Text style={styles.axisLabel}>{timeLabel(last[0], days)}</Text>
        </View>
      </View>
      <Text style={styles.hint}>Hold and drag to inspect prices</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
  },
  tabLabel: { color: theme.colors.text, fontWeight: "600", fontSize: 14 },
  selected: { backgroundColor: theme.colors.accent },
  chartContainer: { justifyContent: "center" },
  axisLabel: { color: theme.colors.textSecondary, fontSize: 11 },
  hiddenAxisLabel: { display: "none" },
  timeLabels: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  hint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  tooltip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  tooltipPrice: { color: theme.colors.text, fontWeight: "600", fontSize: 14 },
  updateStatus: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: theme.colors.surface,
  },
  statusText: { flex: 1 },
});
