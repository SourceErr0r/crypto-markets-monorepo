import type { CryptocurrencyDetails } from "@crypto-markets/api";

import { CURRENCY } from "@/constants";
import { formatCompact, formatPercent, formatPrice } from "@/utils/format";

type ByCurrency = CryptocurrencyDetails["market_data"]["current_price"];

// Detail values come keyed by currency ({ gbp: 1, usd: 1.3 }); a missing key
// means no value.
function inCurrency(values: ByCurrency) {
  return values[CURRENCY] ?? null;
}

// CoinGecko sometimes reports 0 for a micro-priced coin's 24h high/low. A real
// price is never zero, so treat it as missing (same rule as mobile).
function positiveOrNull(value: number | null) {
  return value !== null && value > 0 ? value : null;
}

function Change({ value }: { value: number | null }) {
  const direction = value === null || value === 0 ? "" : value > 0 ? "up" : "down";
  return <span className={direction}>{formatPercent(value)}</span>;
}

// A coin's price, changes and market stats. Presentational only: the expanded
// row and the /coins/[id] page each fetch the data and handle its states.
export function CoinStats({ data }: { data: CryptocurrencyDetails }) {
  const market = data.market_data;
  const changes = [
    { label: "24h", value: inCurrency(market.price_change_percentage_24h_in_currency) },
    { label: "7d", value: inCurrency(market.price_change_percentage_7d_in_currency) },
    { label: "30d", value: inCurrency(market.price_change_percentage_30d_in_currency) },
  ];
  const stats = [
    { label: "Market cap", value: formatCompact(inCurrency(market.market_cap), CURRENCY) },
    { label: "Volume (24h)", value: formatCompact(inCurrency(market.total_volume), CURRENCY) },
    { label: "High (24h)", value: formatPrice(positiveOrNull(inCurrency(market.high_24h)), CURRENCY) },
    { label: "Low (24h)", value: formatPrice(positiveOrNull(inCurrency(market.low_24h)), CURRENCY) },
    { label: "All-time high", value: formatPrice(inCurrency(market.ath), CURRENCY) },
    { label: "Circulating supply", value: formatCompact(market.circulating_supply) },
    { label: "Total supply", value: formatCompact(market.total_supply) },
    { label: "Max supply", value: formatCompact(market.max_supply) },
  ];

  return (
    <>
      <dl className="changes">
        {changes.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <Change value={value} />
            </dd>
          </div>
        ))}
      </dl>
      <dl className="stats">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
