"use client";

import { useCryptocurrencyDetails } from "@crypto-markets/api";
import Link from "next/link";

import { CoinStats } from "@/components/coin-stats";
import { OpenIcon } from "@/components/icons";
import { ErrorMessage, Loading, RefreshFailedNotice } from "@/components/status";
import { CURRENCY } from "@/constants";

// The details shown inside an expanded coin row. It only mounts when the row
// opens, so collapsed rows never fetch. Reopening is instant from the cache.
export function CoinDetailsPanel({ id }: { id: string }) {
  const { data, error, retry } = useCryptocurrencyDetails(id, CURRENCY);

  if (!data) {
    if (!error) return <Loading>Loading details…</Loading>;
    // Retrying a coin that doesn't exist won't help.
    if (error.kind === "not-found") {
      return (
        <p className="status" role="alert">
          {error.message}
        </p>
      );
    }
    return <ErrorMessage error={error} onRetry={retry} />;
  }

  return (
    <>
      <div className="panel-actions">
        {/* The shareable page for this coin, with the same data. */}
        <Link
          href={`/coins/${encodeURIComponent(id)}`}
          className="icon-button"
          aria-label={`Open ${data.name} page`}
          title={`Open ${data.name} page`}
        >
          <OpenIcon />
        </Link>
      </div>
      {error ? <RefreshFailedNotice error={error} /> : null}
      <CoinStats data={data} />
    </>
  );
}
