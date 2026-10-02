import { currencies, type CurrencyCode } from '@/constants/currencies';

export function formatPrice(price: number | null, currency: CurrencyCode) {
  if (price === null) {
    return '—';
  }

  const { symbol } = currencies[currency];
  return price < 1
    ? `${symbol}${price.toFixed(4)}`
    : `${symbol}${price.toFixed(2)}`;
}

export function formatMarketCap(
  marketCap: number | null,
  currency: CurrencyCode,
) {
  if (marketCap === null) {
    return 'Market cap unavailable';
  }

  const { symbol } = currencies[currency];

  if (marketCap >= 1_000_000_000_000) {
    return `Market cap ${symbol}${(marketCap / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (marketCap >= 1_000_000_000) {
    return `Market cap ${symbol}${(marketCap / 1_000_000_000).toFixed(2)}B`;
  }

  return `Market cap ${symbol}${(marketCap / 1_000_000).toFixed(2)}M`;
}
