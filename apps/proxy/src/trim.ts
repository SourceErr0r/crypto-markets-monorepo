// Coin detail's `market_data` has most values keyed by every currency CoinGecko
// supports (around 60), but the app shows one. The proxy caches the full
// response once per coin and trims it per request, so one upstream call serves
// every currency and the client downloads a fraction of the payload.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function trimToCurrency(body: string, currency: string): string {
  const coin: unknown = JSON.parse(body);
  if (!isRecord(coin) || !isRecord(coin.market_data)) return body;

  // Only objects that contain the currency are trimmed. Other objects
  // (such as `roi`) and plain values (such as supply) are kept as they are.
  const marketData = Object.fromEntries(
    Object.entries(coin.market_data).map(([field, value]) =>
      isRecord(value) && currency in value ? [field, { [currency]: value[currency] }] : [field, value],
    ),
  );

  return JSON.stringify({ ...coin, market_data: marketData });
}
