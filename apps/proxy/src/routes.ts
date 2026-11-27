import type { ApiError } from "./http";

// The proxy's allow-list. Every request is matched against these routes and
// rebuilt from validated values only, so:
// - anything not listed here is rejected (404/400) and never reaches CoinGecko;
// - unknown params are dropped and allowed ones normalised, so equivalent
//   requests produce the same upstream URL (which is also the cache key).

// Kept in sync with the app's currency list (apps/mobile/src/constants/currencies.ts)
// until both move to packages/api.
const CURRENCIES = ["gbp", "usd", "eur"];
const PER_PAGE_VALUES = ["10", "50", "100", "250"];
const MAX_PAGE = 100;
// Matches the watchlist cap, so a whole watchlist fits in one request.
const MAX_IDS = 50;
const HISTORY_DAYS = ["1", "7", "30", "90", "365"];
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_LENGTH = 50;

// How long a cached response counts as fresh. These are budget decisions as
// much as freshness ones: the Demo plan allows 10,000 upstream calls a month,
// and one cache key refreshed every T minutes costs up to 43,200 / T a month.
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const MARKETS_TTL = 15 * MINUTE;
const COIN_DETAIL_TTL = 10 * MINUTE;
const SEARCH_TTL = HOUR; // Search results (coin names, ranks) barely change.
// Matches CoinGecko's data granularity: 5-minute points for 1 day, hourly up
// to 90 days, daily beyond.
const CHART_TTL: Record<string, number> = {
  "1": 5 * MINUTE,
  "7": HOUR,
  "30": HOUR,
  "90": HOUR,
  "365": 6 * HOUR,
};

// Starts with a letter or digit, so "." and ".." can't be used as an id.
const COIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;
// CoinGecko endpoints that sit where a coin id would (/coins/list is every
// coin, not a coin called "list"). Without this, `/coins/list?vs_currency=usd`
// would reach an endpoint the allow-list doesn't include.
const RESERVED_COIN_PATHS = ["list", "markets", "categories", "top_gainers_losers"];

export type ProxyRoute = {
  // Path and query to request from CoinGecko, in a fixed param order.
  upstreamPath: string;
  ttlSeconds: number;
  // Set for coin detail: the response is trimmed to this currency (see trim.ts).
  currency?: string;
};

export type RouteResult =
  | { ok: true; route: ProxyRoute }
  | { ok: false; error: ApiError };

function invalid(message: string): RouteResult {
  return { ok: false, error: { status: 400, code: "invalid_param", message } };
}

const notFound: RouteResult = {
  ok: false,
  error: { status: 404, code: "not_found", message: "Unknown endpoint." },
};

function ok(
  path: string,
  params: Record<string, string>,
  ttlSeconds: number,
  currency?: string,
): RouteResult {
  const query = new URLSearchParams(params).toString();
  return { ok: true, route: { upstreamPath: `${path}?${query}`, ttlSeconds, currency } };
}

// Returns the param lowercased, or null if it's missing or not in `allowed`.
function oneOf(params: URLSearchParams, name: string, allowed: string[]): string | null {
  const value = params.get(name)?.toLowerCase();
  return value !== undefined && allowed.includes(value) ? value : null;
}

function markets(params: URLSearchParams): RouteResult {
  const currency = oneOf(params, "vs_currency", CURRENCIES);
  if (!currency) return invalid("vs_currency must be one of: " + CURRENCIES.join(", "));

  if (params.has("ids")) return marketsForIds(currency, params.get("ids") ?? "");

  const perPage = params.has("per_page") ? oneOf(params, "per_page", PER_PAGE_VALUES) : "10";
  if (!perPage) return invalid("per_page must be one of: " + PER_PAGE_VALUES.join(", "));

  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    return invalid(`page must be a whole number from 1 to ${MAX_PAGE}`);
  }

  // `order` is fixed rather than accepted: the app only ranks by market cap.
  return ok("/coins/markets", {
    vs_currency: currency,
    order: "market_cap_desc",
    per_page: perPage,
    page: String(page),
  }, MARKETS_TTL);
}

// Markets for a given set of coins (the watchlist). The ids are deduplicated
// and sorted, so the same set in any order shares one cache entry. `per_page`
// is set to the cap and `page` to 1 so every requested coin comes back in one
// response; client `page`/`per_page` are ignored like any other unknown param.
function marketsForIds(currency: string, rawIds: string): RouteResult {
  const ids = rawIds.split(",");
  if (ids.some((id) => !COIN_ID_PATTERN.test(id))) {
    return invalid("ids must be a comma-separated list of coin ids");
  }

  const unique = [...new Set(ids)].sort();
  if (unique.length > MAX_IDS) return invalid(`ids can list at most ${MAX_IDS} coins`);

  return ok("/coins/markets", {
    vs_currency: currency,
    ids: unique.join(","),
    order: "market_cap_desc",
    per_page: String(MAX_IDS),
    page: "1",
  }, MARKETS_TTL);
}

function coinDetail(id: string, params: URLSearchParams): RouteResult {
  const currency = oneOf(params, "vs_currency", CURRENCIES);
  if (!currency) return invalid("vs_currency must be one of: " + CURRENCIES.join(", "));

  // The upstream URL has no currency: one cached response serves every
  // currency, and the proxy trims it per request.
  return ok(
    `/coins/${id}`,
    { localization: "false", tickers: "false", community_data: "false", developer_data: "false" },
    COIN_DETAIL_TTL,
    currency,
  );
}

function marketChart(id: string, params: URLSearchParams): RouteResult {
  const currency = oneOf(params, "vs_currency", CURRENCIES);
  if (!currency) return invalid("vs_currency must be one of: " + CURRENCIES.join(", "));

  const days = oneOf(params, "days", HISTORY_DAYS);
  if (!days) return invalid("days must be one of: " + HISTORY_DAYS.join(", "));

  return ok(`/coins/${id}/market_chart`, { vs_currency: currency, days }, CHART_TTL[days]);
}

function search(params: URLSearchParams): RouteResult {
  // Lowercased so "BTC" and "btc" share a cache entry; CoinGecko's search
  // isn't case-sensitive.
  const query = (params.get("query") ?? "").trim().toLowerCase();
  if (query.length < SEARCH_MIN_LENGTH || query.length > SEARCH_MAX_LENGTH) {
    return invalid(`query must be ${SEARCH_MIN_LENGTH} to ${SEARCH_MAX_LENGTH} characters`);
  }
  return ok("/search", { query }, SEARCH_TTL);
}

export function matchRoute(url: URL): RouteResult {
  const segments = url.pathname.split("/").filter(Boolean);
  const params = url.searchParams;

  if (segments[0] === "search" && segments.length === 1) return search(params);
  if (segments[0] !== "coins") return notFound;

  if (segments.length === 2 && segments[1] === "markets") return markets(params);

  // Not URL-decoded: real ids never need encoding, so an encoded id is
  // rejected by the pattern rather than decoded into something unexpected.
  const id = segments[1] ?? "";
  if (!COIN_ID_PATTERN.test(id) || RESERVED_COIN_PATHS.includes(id)) return notFound;

  if (segments.length === 2) return coinDetail(id, params);
  if (segments.length === 3 && segments[2] === "market_chart") return marketChart(id, params);

  return notFound;
}
