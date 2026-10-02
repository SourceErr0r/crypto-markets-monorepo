import { currencies, type CurrencyCode } from "@/constants/currencies";
import { LOCALE } from "@/constants/locale";

import { formatNumber } from "@/utils/formatters";

export function formatAmount(
  value: number | null | undefined,
  currency?: CurrencyCode,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatNumber(value, {
    ...(currency
      ? { style: "currency", currency: currencies[currency].code }
      : {}),
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Date unavailable";
  return new Date(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function rangePercentage(
  value: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (
    value == null ||
    min == null ||
    max == null ||
    ![value, min, max].every(Number.isFinite) ||
    max <= min
  ) {
    return null;
  }
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// CoinGecko descriptions contain HTML. Render only text, never executable markup.
export function descriptionText(html: string) {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    ndash: "–",
    mdash: "—",
    hellip: "…",
  };
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) {
        return entities[entity.toLowerCase()] ?? match;
      }
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      const isValid =
        code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return isValid ? String.fromCodePoint(code) : match;
    })
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

export function webUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
