import { priceChartData, priceDomain, timeLabel } from '@/utils/price-chart';

describe('price chart axes', () => {
  it('fits the data with ten percent padding on either side', () => {
    expect(priceDomain([[1, 100], [2, 110], [3, 105]])).toEqual({ min: 99, max: 111 });
  });

  it('handles flat, zero, and very small prices without an invalid scale', () => {
    expect(priceDomain([[1, 100], [2, 100]])).toEqual({ min: 99, max: 101 });
    expect(priceDomain([[1, 0], [2, 0]])).toEqual({ min: 0, max: 1e-8 });
    const { min, max } = priceDomain([[1, 0.000001], [2, 0.000002]]);
    expect(min).toBeCloseTo(0.0000009, 12);
    expect(max).toBeCloseTo(0.0000021, 12);
  });

  it('uses local times for 1D and calendar dates for longer ranges', () => {
    const timestamp = new Date(2026, 9, 2, 15, 30).getTime();
    expect(timeLabel(timestamp, 1)).toBe('15:30');
    expect(timeLabel(timestamp, 7)).toBe('2 Oct');
    expect(timeLabel(timestamp, 30)).toBe('2 Oct');
  });

  it('preserves timestamps and original prices while normalising the price scale', () => {
    const points: [number, number][] = [[0, 100], [100, 110], [1000, 105]];
    const chart = priceChartData(points, 'gbp');
    expect(chart.data.map((point) => point.x)).toEqual([0, 100, 1000]);
    expect(chart.data.map((point) => point.price)).toEqual([100, 110, 105]);
    expect(chart.data[2].value).toBeCloseTo(50);
    expect(chart.labels).toEqual(['£99', '£105', '£111']);
    expect(points).toEqual([[0, 100], [100, 110], [1000, 105]]);
  });

  it.each([0, 100, 0.00000001])('keeps flat prices finite at %s', (price) => {
    const chart = priceChartData([[1, price], [2, price]], 'usd');
    expect(chart.data.every((point) => Number.isFinite(point.value))).toBe(true);
  });

  it('retains precision for small-price tooltips', () => {
    const chart = priceChartData([[1, 0.000001], [2, 0.000002]], 'usd');
    expect(chart.formatPrice(0.000001)).not.toBe(chart.formatPrice(0.000002));
  });

  it('abbreviates large axis values but keeps tooltip prices exact', () => {
    const chart = priceChartData([[1, 80000], [2, 94792]], 'gbp');
    expect(chart.labels).toEqual(['£78.50k', '£87.40k', '£96.30k']);
    expect(chart.formatPrice(87396)).toBe('£87,396');
  });

  it('aligns narrow large-price ranges to distinct compact ticks', () => {
    const chart = priceChartData([[1, 88330], [2, 88342]], 'usd');
    expect(new Set(chart.labels).size).toBe(3);
    expect(chart.data[1].value - chart.data[0].value).toBeGreaterThan(75);
  });

  it('keeps stablecoin movement visible with distinct, precise ticks', () => {
    const chart = priceChartData([[1, 0.999930], [2, 0.999934]], 'usd');
    expect(new Set(chart.labels).size).toBe(3);
    expect(chart.data[1].value - chart.data[0].value).toBeGreaterThan(75);
    expect(chart.formatPrice(0.999932)).toContain('0.999932');
  });

  it('distinguishes sub-cent axis prices without displaying them as zero', () => {
    const chart = priceChartData([[1, 0.000001], [2, 0.000002]], 'usd');
    expect(chart.labels).toEqual(['US$0.0₆9', 'US$0.0₅15', 'US$0.0₅21']);
  });

  it('compacts long runs of leading zeros on the axis but not in the tooltip', () => {
    const chart = priceChartData([[1, 0.0000000092], [2, 0.0000000098]], 'usd');
    expect(chart.labels.every((label) => /^US\$0\.0₈\d+$/.test(label))).toBe(true);
    expect(chart.formatPrice(0.0000000092)).toContain('0.0000000092');
  });

  it('matches fractional-cent tick labels to the plotted price scale', () => {
    const chart = priceChartData([[1, 0.751], [2, 0.759]], 'usd');
    const ticks = chart.labels.map((label) => Number(label.replace('US$', '')));
    expect(ticks[0]).toBeLessThanOrEqual(0.751);
    expect(ticks[2]).toBeGreaterThanOrEqual(0.759);
    expect(ticks[1]).toBeCloseTo((ticks[0] + ticks[2]) / 2, 8);
    for (const point of chart.data) {
      expect(ticks[0] + point.value / 100 * (ticks[2] - ticks[0])).toBeCloseTo(point.price, 8);
    }
    expect(chart.formatPrice(0.759)).toContain('0.759');
  });

  it('retains tooltip precision for narrow ranges above one', () => {
    const chart = priceChartData([[1, 1.000001], [2, 1.000002]], 'usd');
    expect(chart.formatPrice(1.000001)).toBe('US$1.000001');
    expect(chart.formatPrice(1.000002)).toBe('US$1.000002');
    expect(chart.data[1].value - chart.data[0].value).toBeGreaterThan(75);
  });

  it('uses compact million labels', () => {
    const chart = priceChartData([[1, 2000000], [2, 4000000]], 'gbp');
    expect(chart.labels).toEqual(['£1.80M', '£3M', '£4.20M']);
  });
});
