import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAllMarkets, type DisplayError } from "@crypto-markets/api";

import { CryptocurrencyRow } from "@/components/cryptocurrency-row";
import { StateMessage } from "@/components/state-message";
import { Toast } from "@/components/toast";
import { UpdatedLabel } from "@/components/updated-label";
import { currencyCodes } from "@/constants/currencies";
import { theme } from "@/constants/theme";
import { formatWait, refreshErrorMessage } from "@/utils/error-copy";

export default function AllMarketsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ currency?: string }>();
  const currency =
    currencyCodes.find((code) => code === params.currency) ?? currencyCodes[0];
  const {
    cryptocurrencies,
    error,
    errorUpdatedAt,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadMore,
    loadMoreError,
    refresh,
    updatedAt,
  } = useAllMarkets(currency);

  const handleCryptocurrencyPress = (id: string) => {
    const coin = cryptocurrencies.find((item) => item.id === id);
    router.push({
      pathname: "/coin/[id]",
      params: { id, currency, name: coin?.name ?? id },
    });
  };

  const emptyState = isLoading ? (
    <StateMessage loading title="Loading markets" />
  ) : error ? (
    <StateMessage title="Failed to load" message={error.message} onRetry={refresh} />
  ) : (
    <StateMessage
      title="No cryptocurrencies found"
      message="Pull down to refresh the market data."
    />
  );

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.screen}>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 24 + insets.bottom },
          cryptocurrencies.length === 0 && styles.emptyListContent,
        ]}
        data={cryptocurrencies}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        ListFooterComponent={
          cryptocurrencies.length === 0 ? null : (
            <ListFooter
              count={cryptocurrencies.length}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              loadMoreError={loadMoreError}
              onRetry={loadMore}
              updatedAt={updatedAt}
            />
          )
        }
        // After a failed page, wait for the Retry button: scrolling would
        // otherwise refire the request and spend the rate limit.
        onEndReached={loadMoreError ? undefined : loadMore}
        onRefresh={refresh}
        refreshing={isRefreshing}
        renderItem={({ item }) => (
          <CryptocurrencyRow
            currency={currency}
            item={item}
            onRowPress={handleCryptocurrencyPress}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
      {/* A failed next page shows in the footer; this is for a failed refresh. */}
      {error && cryptocurrencies.length > 0 && (
        <Toast
          key={errorUpdatedAt}
          message={refreshErrorMessage(error, updatedAt)}
        />
      )}
    </SafeAreaView>
  );
}

type ListFooterProps = {
  count: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: DisplayError | null;
  onRetry: () => void;
  updatedAt: number | null;
};

// End of the list: loading the next page, a failed page, or the end.
function ListFooter({
  count,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onRetry,
  updatedAt,
}: ListFooterProps) {
  const updated =
    updatedAt === null ? null : (
      <UpdatedLabel style={styles.footerText} updatedAt={updatedAt} />
    );

  if (isLoadingMore) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator
          accessibilityLabel="Loading more coins"
          color={theme.colors.accent}
        />
      </View>
    );
  }

  if (loadMoreError) {
    const message = loadMoreError.retryAfterSeconds
      ? `Couldn't load more · try again in ${formatWait(loadMoreError.retryAfterSeconds)}`
      : loadMoreError.message;
    return (
      <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={styles.footerText}>
          {message}
        </Text>
        <Pressable
          accessibilityLabel="Try loading more coins again"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        {updated}
      </View>
    );
  }

  return (
    <View style={styles.footer}>
      {!hasMore && (
        <Text style={styles.footerText}>
          {`End of the top ${count}. Use search to find other coins.`}
        </Text>
      )}
      {updated}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  footer: {
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  retry: {
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
