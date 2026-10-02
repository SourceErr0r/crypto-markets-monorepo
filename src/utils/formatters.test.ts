import { formatMarketCap, formatPrice } from '@/utils/formatters';

describe('formatPrice', () => {
  it('formats a small price with four decimal places', () => {
    expect(formatPrice(0.01234, 'gbp')).toBe('£0.0123');
  });

  it('formats whole-unit prices with two decimal places and the selected symbol', () => {
    expect(formatPrice(125.5, 'eur')).toBe('€125.50');
  });

  it('returns a placeholder when the price is unavailable', () => {
    expect(formatPrice(null, 'usd')).toBe('—');
  });
});

describe('formatMarketCap', () => {
  it('formats billions and trillions using the selected currency symbol', () => {
    expect(formatMarketCap(1_500_000_000, 'usd')).toBe('Market cap $1.50B');
    expect(formatMarketCap(2_000_000_000_000, 'gbp')).toBe('Market cap £2.00T');
  });

  it('returns a clear unavailable message for a missing market cap', () => {
    expect(formatMarketCap(null, 'eur')).toBe('Market cap unavailable');
  });
});
