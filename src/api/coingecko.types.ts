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
  market_data: {
    current_price: Record<string, number | null>;
    total_volume: Record<string, number | null>;
    market_cap: Record<string, number | null>;
  };
};

export type CryptocurrencySearchResult = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
};

export type CoinGeckoErrorResponse = {
  error?: string;
  status?: {
    error_message?: string;
  };
};
