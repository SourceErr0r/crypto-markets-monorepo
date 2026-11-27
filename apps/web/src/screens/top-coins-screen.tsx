"use client";

import { MIN_SEARCH_LENGTH, useCryptocurrencies } from "@crypto-markets/api";
import { useRef, useState } from "react";

import { CoinRow } from "@/components/coin-row";
import { CloseIcon, SearchIcon } from "@/components/icons";
import {
  Empty,
  ErrorMessage,
  Loading,
  RefreshFailedNotice,
} from "@/components/status";
import { CURRENCY } from "@/constants";
import { CoinDetailsPanel } from "@/screens/coin-details-panel";
import { SearchResults } from "@/screens/search-results";
import { formatCompact, formatPrice } from "@/utils/format";

// The home page: the top 10, with a search field that opens inline. Once a
// search term is long enough, its results replace the top 10.
export function TopCoinsScreen() {
  const { cryptocurrencies, error, isLoading, refresh } =
    useCryptocurrencies(CURRENCY);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const isSearching = isSearchOpen && query.trim().length >= MIN_SEARCH_LENGTH;

  // Closing clears the term, so the top 10 comes back (from the cache).
  function toggleSearch() {
    setQuery("");
    setIsSearchOpen((open) => !open);
  }

  function closeSearch() {
    setQuery("");
    setIsSearchOpen(false);
    // The field disappears, so put keyboard focus back where it started.
    searchButtonRef.current?.focus();
  }

  return (
    <>
      <div className="toolbar">
        <h1>{isSearching ? "Search results" : "Top 10 by market cap"}</h1>
        <button
          ref={searchButtonRef}
          type="button"
          className="icon-button"
          aria-label={isSearchOpen ? "Close search" : "Search coins"}
          title={isSearchOpen ? "Close search" : "Search coins"}
          aria-expanded={isSearchOpen}
          aria-controls="coin-search"
          onClick={toggleSearch}
        >
          {isSearchOpen ? <CloseIcon /> : <SearchIcon />}
        </button>
      </div>

      {isSearchOpen ? (
        <input
          id="coin-search"
          className="search-input"
          type="search"
          aria-label="Search by name or symbol"
          placeholder="Search by name or symbol, e.g. Bitcoin or BTC"
          autoComplete="off"
          // Opened by the user's click, so moving focus here is expected.
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeSearch();
          }}
        />
      ) : null}

      {isSearching ? (
        <SearchResults query={query} />
      ) : isLoading ? (
        <Loading>Loading prices…</Loading>
      ) : cryptocurrencies.length === 0 ? (
        error ? (
          <ErrorMessage error={error} onRetry={refresh} />
        ) : (
          <Empty>No coins to show right now.</Empty>
        )
      ) : (
        <>
          {/* A background refresh failed: keep the list, say it may be old. */}
          {error ? <RefreshFailedNotice error={error} /> : null}
          <ol className="coin-list">
            {cryptocurrencies.map((coin) => (
              <CoinRow
                key={coin.id}
                name={coin.name}
                symbol={coin.symbol}
                image={coin.image}
                rank={coin.market_cap_rank}
                details={<CoinDetailsPanel id={coin.id} />}
              >
                <span>{formatPrice(coin.current_price, CURRENCY)}</span>
                <span className="muted">
                  {formatCompact(coin.market_cap, CURRENCY)}
                </span>
              </CoinRow>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
