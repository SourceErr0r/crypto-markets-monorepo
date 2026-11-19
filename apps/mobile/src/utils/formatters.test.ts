import { formatAge, formatDecimal, formatNumber, formatMarketCap, formatPrice } from '@/utils/formatters';

describe('formatPrice', () => {
  it('formats a small price with four decimal places', () => {
    expect(formatPrice(0.01234, 'gbp')).toBe('£0.0123');
  });

  it('formats prices with up to two decimal places and the selected symbol', () => {
    expect(formatPrice(125.5, 'eur')).toBe('€125.50');
  });

  it('returns a placeholder when the price is unavailable', () => {
    expect(formatPrice(null, 'usd')).toBe('—');
  });
});

describe('formatMarketCap', () => {
  it('formats billions and trillions using the selected currency symbol', () => {
    expect(formatMarketCap(1_500_000_000, 'usd')).toBe('Market cap US$1.50B');
    expect(formatMarketCap(2_000_000_000_000, 'gbp')).toBe('Market cap £2T');
  });

  it('returns a clear unavailable message for a missing market cap', () => {
    expect(formatMarketCap(null, 'eur')).toBe('Market cap unavailable');
  });
});


describe('optional decimal places', () => {
  it('omits padding for whole prices, zero and rounded whole values', () => {
    expect(formatPrice(88336, 'usd')).toBe('US$88,336');
    expect(formatPrice(0, 'usd')).toBe('US$0');
    expect(formatPrice(1.999, 'gbp')).toBe('£2');
    expect(formatMarketCap(25000000, 'eur')).toBe('Market cap €25M');
  });

  it('preserves significant decimals and negative percentage values', () => {
    expect(formatDecimal(2, 2)).toBe('2');
    expect(formatDecimal(-2.5, 2)).toBe('-2.50');
    expect(formatDecimal(2.056, 2)).toBe('2.06');
    expect(formatDecimal(50, 1)).toBe('50');
    expect(formatPrice(0.0123, 'usd')).toBe('US$0.0123');
  });
});


describe('formatted number decimal policy', () => {
  it('pads fractional large values and omits decimals for rounded whole values', () => {
    expect(formatNumber(123.8)).toBe('123.80');
    expect(formatNumber(123)).toBe('123');
    expect(formatNumber(123.999)).toBe('124');
    expect(formatNumber(-123.8)).toBe('-123.80');
    // The suffix's case comes from the runtime's ICU locale data (newer en-GB
    // data uses "m"), so only the decimal handling before it is asserted.
    expect(formatNumber(1500000, { notation: 'compact' })).toMatch(/^1\.50[mM]$/);
    expect(formatNumber(2000000, { notation: 'compact' })).toMatch(/^2[mM]$/);
  });

  it('keeps micro prices from rounding to zero', () => {
    expect(formatPrice(0.0006, 'gbp')).toBe('£0.0006');
    expect(formatPrice(0.00123, 'usd')).toBe('US$0.00123');
  });

  it('collapses long runs of leading zeros into a subscript count', () => {
    expect(formatPrice(0.000006, 'gbp')).toBe('£0.0₅6');
    expect(formatPrice(0.00001234, 'usd')).toBe('US$0.0₄123');
    expect(formatPrice(1.30508e-10, 'gbp')).toBe('£0.0₉131');
    expect(formatPrice(7.7429e-11, 'gbp')).toBe('£0.0₁₀774');
  });

  it('preserves extra precision below one', () => {
    expect(formatNumber(0.01234)).toBe('0.0123');
    expect(formatNumber(0.00000123, { maximumFractionDigits: 8 })).toBe('0.00000123');
    expect(formatPrice(0.01234, 'gbp')).toBe('£0.0123');
  });
});

it('honours explicit precision consistently across decimal and currency formatting', () => {
  expect(formatDecimal(83.456, 1)).toBe('83.5');
  expect(formatDecimal(0.5, 2)).toBe(formatNumber(0.5));
  expect(formatNumber(1.000001, { maximumFractionDigits: 6 })).toBe('1.000001');
  expect(formatNumber(12.6, { maximumFractionDigits: 0 })).toBe('13');
  expect(formatPrice(88336, 'usd')).toBe(formatNumber(88336, { style: 'currency', currency: 'USD' }));
});

describe('formatAge', () => {
  const updatedAt = Date.parse('2026-11-18T12:00:00Z');
  const after = (ms: number) => formatAge(updatedAt, updatedAt + ms);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;

  it('calls anything under a minute "just now"', () => {
    expect(after(0)).toBe('just now');
    expect(after(59 * SECOND)).toBe('just now');
  });

  it('counts whole minutes, then whole hours, rounding down', () => {
    expect(after(MINUTE)).toBe('1 min ago');
    expect(after(59 * MINUTE + 59 * SECOND)).toBe('59 min ago');
    expect(after(HOUR)).toBe('1 h ago');
    expect(after(23 * HOUR + 59 * MINUTE)).toBe('23 h ago');
  });

  it('gives the date once the data is a day old', () => {
    expect(after(24 * HOUR)).toBe('on 18 Nov');
  });

  it('treats a device clock behind the server as "just now"', () => {
    expect(after(-5 * MINUTE)).toBe('just now');
  });
});
