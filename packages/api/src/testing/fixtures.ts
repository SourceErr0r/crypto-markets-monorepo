import type { CurrencyCode } from "../currencies";

// Response bodies as the API proxy returns them (raw JSON, before parsing).
// Trimmed to the fields the app reads plus a few it ignores, so tests also
// show that unknown fields are dropped.

export const marketsFixture = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://example.com/bitcoin.png",
    market_cap_rank: 1,
    current_price: 65000,
    total_volume: 30000000000,
    market_cap: 1280000000000,
    fully_diluted_valuation: 1365000000000,
    last_updated: "2026-11-18T12:00:30.000Z",
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://example.com/ethereum.png",
    market_cap_rank: 2,
    current_price: 3200,
    total_volume: 15000000000,
    market_cap: 385000000000,
    fully_diluted_valuation: 385000000000,
    last_updated: "2026-11-18T12:00:00.000Z",
  },
];

// The proxy returns market data in the requested currency only.
export function coinDetailsFixture(currency: CurrencyCode = "usd") {
  const inCurrency = <T>(value: T) => ({ [currency]: value });
  return {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: {
      small: "https://example.com/bitcoin-small.png",
      large: "https://example.com/bitcoin-large.png",
    },
    market_cap_rank: 1,
    description: { en: "The first cryptocurrency." },
    links: {
      homepage: ["https://bitcoin.org", ""],
      whitepaper: "https://bitcoin.org/bitcoin.pdf",
    },
    last_updated: "2026-11-18T12:00:00.000Z",
    market_data: {
      current_price: inCurrency(65000),
      market_cap: inCurrency(1280000000000),
      total_volume: inCurrency(30000000000),
      high_24h: inCurrency(66000),
      low_24h: inCurrency(64000),
      ath: inCurrency(73000),
      atl: inCurrency(67.81),
      ath_date: inCurrency("2024-03-14T07:10:36.635Z"),
      atl_date: inCurrency("2013-07-06T00:00:00.000Z"),
      price_change_percentage_24h_in_currency: inCurrency(1.5),
      price_change_percentage_7d_in_currency: inCurrency(-2.25),
      price_change_percentage_30d_in_currency: inCurrency(8),
      circulating_supply: 19700000,
      total_supply: 21000000,
      max_supply: 21000000,
    },
  };
}

export const priceHistoryFixture = {
  prices: [
    [1731888000000, 64000],
    [1731891600000, 64500],
    [1731895200000, 65000],
  ],
  market_caps: [],
  total_volumes: [],
};

export const searchFixture = {
  coins: [
    {
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      api_symbol: "bitcoin",
      market_cap_rank: 1,
      thumb: "https://example.com/bitcoin-thumb.png",
    },
  ],
  exchanges: [],
  categories: [],
};
