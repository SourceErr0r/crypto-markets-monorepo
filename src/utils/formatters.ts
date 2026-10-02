import { currencies, type CurrencyCode } from "@/constants/currencies";
import { LOCALE } from "@/constants/locale";

export function formatDecimal(value: number, decimalPlaces: number) {
  return formatNumber(value, {
    useGrouping: false,
    maximumFractionDigits: decimalPlaces,
  });
}

// Values of 1 or more use 2 decimals. Smaller values keep two significant
// digits (minimum 4 decimals) so micro-priced coins don't round to zero.
function defaultFractionDigits(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1) return 2;
  if (abs === 0) return 4;
  return Math.min(12, Math.max(4, Math.ceil(-Math.log10(abs)) + 2));
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
) {
  const maximumFractionDigits =
    options.maximumFractionDigits ?? defaultFractionDigits(value);
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    ...options,
    maximumFractionDigits,
  }).format(value);
  // The fixed locale uses a decimal point. Remove only an entirely
  // zero fraction, including before compact suffixes, without formatToParts.
  return formatted.replace(/\.0+(?=\D|$)/, "");
}

export function formatPrice(price: number | null, currency: CurrencyCode) {
  if (price === null) {
    return "—";
  }

  return formatNumber(price, {
    style: "currency",
    currency: currencies[currency].code,
  });
}

export function formatMarketCap(
  marketCap: number | null,
  currency: CurrencyCode,
) {
  if (marketCap === null) {
    return "Market cap unavailable";
  }

  // Scale explicitly: some mobile runtimes ignore Intl's compact notation.
  const [divisor, suffix] = marketCap >= 1_000_000_000_000
    ? [1_000_000_000_000, "T"] as const
    : marketCap >= 1_000_000_000
      ? [1_000_000_000, "B"] as const
      : [1_000_000, "M"] as const;

  return `Market cap ${formatNumber(marketCap / divisor, {
    style: "currency",
    currency: currencies[currency].code,
    maximumFractionDigits: 2,
  })}${suffix}`;
}
