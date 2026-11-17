import { invalidResponseError } from "@/api/coingecko-errors";
import type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
  PriceHistoryPoint,
} from "@/api/coingecko.types";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numbers(value: unknown): Record<string, number | null> {
  return Object.fromEntries(
    Object.entries(record(value)).map(([key, value]) => [key, number(value)]),
  );
}

function strings(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record(value)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function parseCryptocurrencies(value: unknown): Cryptocurrency[] {
  if (!Array.isArray(value)) throw invalidResponseError();

  return value.map((item) => {
    const coin = record(item);
    if (
      typeof coin.id !== "string" ||
      typeof coin.name !== "string" ||
      typeof coin.symbol !== "string"
    ) {
      throw invalidResponseError();
    }
    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      image: typeof coin.image === "string" ? coin.image : "",
      market_cap_rank: number(coin.market_cap_rank),
      current_price: number(coin.current_price),
      total_volume: number(coin.total_volume),
      market_cap: number(coin.market_cap),
    };
  });
}

export function parseCryptocurrencyDetails(
  value: unknown,
): CryptocurrencyDetails {
  const data = record(value);
  const market = record(data.market_data);
  if (
    typeof data.id !== "string" ||
    !data.id ||
    typeof data.name !== "string" ||
    !data.name ||
    typeof data.symbol !== "string" ||
    Object.keys(market).length === 0
  ) {
    throw invalidResponseError();
  }
  const image = strings(data.image);
  const links = record(data.links);
  return {
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    image: { small: image.small ?? "", large: image.large ?? "" },
    market_cap_rank: number(data.market_cap_rank),
    description: { en: strings(data.description).en ?? "" },
    links: {
      homepage: Array.isArray(links.homepage)
        ? links.homepage.filter((url): url is string => typeof url === "string")
        : [],
      whitepaper:
        typeof links.whitepaper === "string" ? links.whitepaper : null,
    },
    last_updated:
      typeof data.last_updated === "string" ? data.last_updated : null,
    market_data: {
      current_price: numbers(market.current_price),
      market_cap: numbers(market.market_cap),
      total_volume: numbers(market.total_volume),
      high_24h: numbers(market.high_24h),
      low_24h: numbers(market.low_24h),
      ath: numbers(market.ath),
      atl: numbers(market.atl),
      ath_date: strings(market.ath_date),
      atl_date: strings(market.atl_date),
      price_change_percentage_24h_in_currency: numbers(
        market.price_change_percentage_24h_in_currency,
      ),
      price_change_percentage_7d_in_currency: numbers(
        market.price_change_percentage_7d_in_currency,
      ),
      price_change_percentage_30d_in_currency: numbers(
        market.price_change_percentage_30d_in_currency,
      ),
      circulating_supply: number(market.circulating_supply),
      total_supply: number(market.total_supply),
      max_supply: number(market.max_supply),
    },
  };
}

export function parsePriceHistory(value: unknown): PriceHistoryPoint[] {
  const { prices } = record(value);
  if (
    !Array.isArray(prices) ||
    prices.some(
      (point) =>
        !Array.isArray(point) ||
        point.length !== 2 ||
        number(point[0]) === null ||
        point[0] < 0 ||
        point[0] > 8.64e15 ||
        number(point[1]) === null ||
        point[1] < 0,
    )
  ) {
    throw invalidResponseError();
  }
  // Sort by timestamp and collapse duplicates before drawing the line.
  return Array.from(new Map(prices as PriceHistoryPoint[])).sort(
    (a, b) => a[0] - b[0],
  );
}

export function parseSearchResults(
  value: unknown,
): CryptocurrencySearchResult[] {
  const { coins } = record(value);
  if (!Array.isArray(coins)) throw invalidResponseError();

  return coins.map((item) => {
    const coin = record(item);
    if (
      typeof coin.id !== "string" ||
      typeof coin.name !== "string" ||
      typeof coin.symbol !== "string"
    ) {
      throw invalidResponseError();
    }
    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      market_cap_rank: number(coin.market_cap_rank),
      thumb: typeof coin.thumb === "string" ? coin.thumb : "",
    };
  });
}
