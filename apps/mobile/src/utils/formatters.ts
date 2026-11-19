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
  return Math.min(20, Math.max(4, Math.ceil(-Math.log10(abs)) + 2));
}

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

// Collapse long runs of leading decimal zeros: 0.00000000098 becomes 0.0₉98.
export function compactZeros(formatted: string) {
  return formatted.replace(
    /\.(0{4,})(\d+)/,
    (_, zeros: string, rest: string) =>
      `.0${[...String(zeros.length)].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("")}${rest}`,
  );
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

  return compactZeros(
    formatNumber(price, {
      style: "currency",
      currency: currencies[currency].code,
    }),
  );
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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// How old data is, for "Updated 12 min ago". Rounded down, so it never
// claims data is older than it is. A device clock behind the server's counts
// as "just now" rather than a negative age.
export function formatAge(timestamp: number, now: number) {
  const age = Math.max(now - timestamp, 0);
  if (age < MINUTE_MS) return "just now";
  if (age < HOUR_MS) return `${Math.floor(age / MINUTE_MS)} min ago`;
  if (age < DAY_MS) return `${Math.floor(age / HOUR_MS)} h ago`;
  return `on ${new Date(timestamp).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  })}`;
}
