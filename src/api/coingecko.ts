import type {
  CoinGeckoErrorResponse,
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
} from '@/api/coingecko.types';

export type {
  Cryptocurrency,
  CryptocurrencyDetails,
  CryptocurrencySearchResult,
} from '@/api/coingecko.types';

const API_KEY = process.env.COINGECKO_API_KEY;
const baseUrl = 'https://api.coingecko.com/api/v3';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: API_KEY ? { 'x-cg-demo-api-key': API_KEY } : undefined,
  });

  if (!response.ok) {
    const errorResponse = (await response.json().catch(() => null)) as CoinGeckoErrorResponse | null;
    throw new Error(
      errorResponse?.status?.error_message ?? errorResponse?.error ?? 'CoinGecko request failed.',
    );
  }

  return (await response.json()) as T;
}

export function getTopCryptocurrencies(): Promise<Cryptocurrency[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '10',
    page: '1',
    sparkline: 'false',
  });

  return request<Cryptocurrency[]>(`/coins/markets?${params.toString()}`);
}

export function getCryptocurrencyDetails(coinId: string): Promise<CryptocurrencyDetails> {
  return request<CryptocurrencyDetails>(
    `/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`,
  );
}

export async function searchCryptocurrencies(query: string): Promise<CryptocurrencySearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const response = await request<{ coins: CryptocurrencySearchResult[] }>(
    `/search?query=${encodeURIComponent(trimmedQuery)}`,
  );

  return response.coins;
}
