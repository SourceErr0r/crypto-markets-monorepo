// The newest of CoinGecko's `last_updated` times, in ms, or null if none is
// usable. Shown as "Updated 14:05": when the prices were last fresh, however
// many caches they passed through since. The newest is closest to when the
// proxy fetched them; the oldest would let one rarely-traded coin drag the
// time back.
export function newestUpdate(dates: (string | null)[]) {
  const times = dates
    .map((date) => (date === null ? NaN : Date.parse(date)))
    .filter((time) => !Number.isNaN(time));
  return times.length > 0 ? Math.max(...times) : null;
}
