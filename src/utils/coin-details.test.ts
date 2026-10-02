import { descriptionText, formatAmount, positiveOrNull, rangePercentage, webUrl } from '@/utils/coin-details';

describe('coin detail presentation', () => {
  it('handles missing, flat and out-of-range statistics', () => {
    expect(rangePercentage(null, 0, 100)).toBeNull();
    expect(rangePercentage(5, 5, 5)).toBeNull();
    expect(rangePercentage(5, 10, 0)).toBeNull();
    expect(rangePercentage(Infinity, 0, 100)).toBeNull();
    expect(rangePercentage(15, 10, 20)).toBe(50);
    expect(rangePercentage(25, 10, 20)).toBe(100);
    expect(rangePercentage(-5, 0, 20)).toBe(0);
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount(0)).toBe('0');
  });

  it('omits forced decimals in currency statistics and retains fractional amounts', () => {
    expect(formatAmount(88336, 'usd')).toBe('US$88,336');
    expect(formatAmount(88336.8, 'usd')).toBe('US$88,336.80');
    expect(formatAmount(88336.25, 'usd')).toBe('US$88,336.25');
    expect(formatAmount(0, 'gbp')).toBe('£0');
    expect(formatAmount(2000000, 'gbp')).toBe('£2M');
  });

  it('scales large amounts with explicit unit suffixes', () => {
    expect(formatAmount(1_500_000)).toBe('1.50M');
    expect(formatAmount(21_000_000_000)).toBe('21B');
    expect(formatAmount(1_000_000_000_000)).toBe('1T');
    expect(formatAmount(1e15)).toBe('1Q');
    expect(formatAmount(2.5e15, 'usd')).toBe('US$2.50Q');
    expect(formatAmount(999_999)).toBe('999,999');
  });

  it('treats a zero 24h high or low as missing data', () => {
    expect(positiveOrNull(0)).toBeNull();
    expect(positiveOrNull(null)).toBeNull();
    expect(positiveOrNull(undefined)).toBeNull();
    expect(positiveOrNull(1.3e-10)).toBe(1.3e-10);
  });

  it('converts description markup to readable text', () => {
    expect(descriptionText('<p>Bitcoin &amp; <a href="https://example.com">friends</a>.</p><p>It&#39;s money.<br>More &mdash; here.</p>'))
      .toBe("Bitcoin & friends.\nIt's money.\nMore — here.");
    expect(descriptionText('<script>hidden()</script><style>hidden</style>Text &#x1F4B0;'))
      .toBe('Text 💰');
    expect(() => descriptionText('&#99999999;')).not.toThrow();
  });

  it('only allows web links', () => {
    expect(webUrl('https://bitcoin.org')).toBe('https://bitcoin.org/');
    expect(webUrl('javascript:alert(1)')).toBeNull();
    expect(webUrl('file:///tmp/example')).toBeNull();
    expect(webUrl('not a URL')).toBeNull();
    expect(webUrl('')).toBeNull();
  });
});
