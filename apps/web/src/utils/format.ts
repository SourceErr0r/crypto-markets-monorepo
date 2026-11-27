import type { CurrencyCode } from "@crypto-markets/api";

import { LOCALE } from "@/constants";

// Browsers support Intl's compact notation and significant digits, so unlike
// mobile (where some runtimes ignore them) these are thin wrappers.

const MISSING = "—";

// £64,123.45 for normal prices. Below £1, 2 to 4 significant digits, so
// micro-priced coins don't round to £0.00 (£0.00001234) and £0.50 keeps its 0.
export function formatPrice(value: number | null, currency: CurrencyCode) {
  if (value === null) return MISSING;
  const digits =
    Math.abs(value) >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumSignificantDigits: 2, maximumSignificantDigits: 4 };
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
    ...digits,
  }).format(value);
}

// £1.23T for money, 19.8M for counts such as supply.
export function formatCompact(value: number | null, currency?: CurrencyCode) {
  if (value === null) return MISSING;
  return new Intl.NumberFormat(LOCALE, {
    notation: "compact",
    maximumFractionDigits: 2,
    ...(currency ? { style: "currency", currency: currency.toUpperCase() } : {}),
  }).format(value);
}

// +2.35% / -0.80%. The sign is always shown so colour isn't the only signal.
export function formatPercent(value: number | null) {
  if (value === null) return MISSING;
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
