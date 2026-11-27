"use client";

import { useCryptocurrencyDetails } from "@crypto-markets/api";
import Link from "next/link";

import { CoinStats } from "@/components/coin-stats";
import { ErrorMessage, Loading, RefreshFailedNotice } from "@/components/status";
import { CURRENCY } from "@/constants";
import { formatPrice } from "@/utils/format";

// The /coins/[id] page: a direct, shareable link to one coin. Same data and
// query (so the same cache entry) as the expanded row, plus a header.
export function CoinDetailsScreen({ id }: { id: string }) {
  const { data, error, retry } = useCryptocurrencyDetails(id, CURRENCY);

  if (!data) {
    if (!error) return <Loading>Loading coin…</Loading>;
    // Retrying a coin that doesn't exist won't help; offer a way out instead.
    if (error.kind === "not-found") {
      return (
        <div className="status" role="alert">
          <p>{error.message}</p>
          <Link href="/">Back to top coins</Link>
        </div>
      );
    }
    return <ErrorMessage error={error} onRetry={retry} />;
  }

  return (
    <>
      {error ? <RefreshFailedNotice error={error} /> : null}

      <div className="coin-header">
        {data.image.large ? (
          <img src={data.image.large} alt="" width={48} height={48} />
        ) : null}
        <h1>
          {data.name} <span className="muted">{data.symbol.toUpperCase()}</span>
        </h1>
        {data.market_cap_rank !== null ? (
          <span className="badge">Rank #{data.market_cap_rank}</span>
        ) : null}
      </div>

      <p className="price">
        {formatPrice(data.market_data.current_price[CURRENCY] ?? null, CURRENCY)}
      </p>

      <CoinStats data={data} />
    </>
  );
}
