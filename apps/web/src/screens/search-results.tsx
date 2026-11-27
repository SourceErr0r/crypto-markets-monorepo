"use client";

import { useCryptocurrencySearch } from "@crypto-markets/api";

import { CoinRow } from "@/components/coin-row";
import { Empty, ErrorMessage, Loading } from "@/components/status";
import { CoinDetailsPanel } from "@/screens/coin-details-panel";

// Results for what's typed in the home page's search field. The hook waits
// for typing to pause, so each keystroke isn't a request.
export function SearchResults({ query }: { query: string }) {
  const { results, error, isLoading, retry } = useCryptocurrencySearch(query);

  if (isLoading) return <Loading>Searching…</Loading>;
  if (error) return <ErrorMessage error={error} onRetry={retry} />;
  if (results.length === 0) {
    return <Empty>No coins match &ldquo;{query.trim()}&rdquo;.</Empty>;
  }

  return (
    <ul className="coin-list">
      {results.map((coin) => (
        <CoinRow
          key={coin.id}
          name={coin.name}
          symbol={coin.symbol}
          image={coin.thumb}
          rank={coin.market_cap_rank}
          details={<CoinDetailsPanel id={coin.id} />}
        />
      ))}
    </ul>
  );
}
