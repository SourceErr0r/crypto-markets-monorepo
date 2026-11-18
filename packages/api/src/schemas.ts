import { z } from "zod";

// Response schemas for the API proxy. They check only the fields the app uses
// (unknown keys are stripped) and decide what a bad value means:
// - Identity fields (id, name, symbol) are required. Without them the response
//   is unusable, so parsing fails and the client reports an invalid response.
// - Display fields fall back with `.catch()`. One missing price shouldn't
//   hide the whole screen; the UI shows "unavailable" for null instead.

// Missing, null, non-numeric or non-finite all become null.
const optionalNumber = z.number().nullable().catch(null);
const optionalUrl = z.string().catch("");
// CoinGecko keys many detail fields by currency: { usd: 1, gbp: 0.8 }.
const numbersByCurrency = z.record(z.string(), optionalNumber).catch({});
const datesByCurrency = z
  .record(z.string(), z.string().optional().catch(undefined))
  .catch({});

export const cryptocurrencySchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: optionalUrl,
  market_cap_rank: optionalNumber,
  current_price: optionalNumber,
  total_volume: optionalNumber,
  market_cap: optionalNumber,
});

export const marketsSchema = z.array(cryptocurrencySchema);

export const cryptocurrencyDetailsSchema = z.object({
  id: z.string().min(1),
  symbol: z.string(),
  name: z.string().min(1),
  image: z
    .object({ small: optionalUrl, large: optionalUrl })
    .catch({ small: "", large: "" }),
  market_cap_rank: optionalNumber,
  description: z.object({ en: z.string().catch("") }).catch({ en: "" }),
  links: z
    .object({
      homepage: z.array(z.string()).catch([]),
      whitepaper: z.string().nullable().catch(null),
    })
    .catch({ homepage: [], whitepaper: null }),
  last_updated: z.string().nullable().catch(null),
  // Required: a coin page without market data has nothing to show.
  market_data: z.object({
    current_price: numbersByCurrency,
    market_cap: numbersByCurrency,
    total_volume: numbersByCurrency,
    high_24h: numbersByCurrency,
    low_24h: numbersByCurrency,
    ath: numbersByCurrency,
    atl: numbersByCurrency,
    ath_date: datesByCurrency,
    atl_date: datesByCurrency,
    price_change_percentage_24h_in_currency: numbersByCurrency,
    price_change_percentage_7d_in_currency: numbersByCurrency,
    price_change_percentage_30d_in_currency: numbersByCurrency,
    circulating_supply: optionalNumber,
    total_supply: optionalNumber,
    max_supply: optionalNumber,
  }),
});

// [timestamp in ms, price]. A chart with one bad point would be misleading,
// so any invalid point rejects the whole series. The upper bound is the
// largest valid JavaScript Date.
const pricePointSchema = z.tuple([
  z.number().min(0).max(8.64e15),
  z.number().min(0),
]);

export const priceHistorySchema = z
  .object({ prices: z.array(pricePointSchema) })
  // Sort by timestamp and collapse duplicates before drawing the line.
  .transform(({ prices }) =>
    Array.from(new Map(prices)).sort((a, b) => a[0] - b[0]),
  );

export const searchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  market_cap_rank: optionalNumber,
  thumb: optionalUrl,
});

export const searchResponseSchema = z
  .object({ coins: z.array(searchResultSchema) })
  .transform(({ coins }) => coins);
