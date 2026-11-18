export type Cryptocurrency = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number | null;
  current_price: number | null;
  total_volume: number | null;
  market_cap: number | null;
};

export type CryptocurrencyDetails = {
  id: string;
  symbol: string;
  name: string;
  image: {
    small: string;
    large: string;
  };
  market_cap_rank: number | null;
  description: { en: string };
  links: { homepage: string[]; whitepaper: string | null };
  last_updated: string | null;
  market_data: {
    current_price: Record<string, number | null>;
    total_volume: Record<string, number | null>;
    market_cap: Record<string, number | null>;
    high_24h: Record<string, number | null>;
    low_24h: Record<string, number | null>;
    ath: Record<string, number | null>;
    atl: Record<string, number | null>;
    ath_date: Record<string, string>;
    atl_date: Record<string, string>;
    price_change_percentage_24h_in_currency: Record<string, number | null>;
    price_change_percentage_7d_in_currency: Record<string, number | null>;
    price_change_percentage_30d_in_currency: Record<string, number | null>;
    circulating_supply: number | null;
    total_supply: number | null;
    max_supply: number | null;
  };
};

export type PriceHistoryPoint = [timestamp: number, price: number];
export type HistoryDays = 1 | 7 | 30;

export type CryptocurrencySearchResult = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
};
