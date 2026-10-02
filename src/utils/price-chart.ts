import type { HistoryDays, PriceHistoryPoint } from "@/api/coingecko.types";
import { currencies, type CurrencyCode } from "@/constants/currencies";
import { LOCALE } from "@/constants/locale";

import { formatNumber } from "@/utils/formatters";

export function priceDomain(points: PriceHistoryPoint[]) {
  const prices = points.map((point) => point[1]);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  // A flat series still needs a non-zero domain. Keep zero-price assets valid.
  const padding = high > low ? (high - low) * 0.1 : Math.max(high * 0.01, 1e-8);
  return { min: Math.max(0, low - padding), max: high + padding };
}

export function timeLabel(timestamp: number, days: HistoryDays) {
  const date = new Date(timestamp);
  return days === 1
    ? date.toLocaleTimeString(LOCALE, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export type ChartPricePoint = { x: number; value: number; price: number };

const UNITS = [
  { threshold: 1e12, suffix: "T" },
  { threshold: 1e9, suffix: "B" },
  { threshold: 1e6, suffix: "M" },
  { threshold: 1e3, suffix: "k" },
];

function formatCurrency(
  value: number,
  currency: CurrencyCode,
  maximumFractionDigits: number,
) {
  return formatNumber(value, {
    style: "currency",
    currency: currencies[currency].code,
    maximumFractionDigits,
  });
}

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

// Collapse long runs of leading decimal zeros: 0.00000000098 becomes 0.0₉98.
function compactZeros(formatted: string) {
  return formatted.replace(
    /\.(0{4,})(\d+)/,
    (_, zeros: string, rest: string) =>
      `.0${[...String(zeros.length)].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("")}${rest}`,
  );
}

function formatAxisPrice(
  value: number,
  currency: CurrencyCode,
  quantum: number,
) {
  // Explicit units keep formatting consistent across mobile Intl implementations.
  const unit = UNITS.find(({ threshold }) => value >= threshold);
  const divisor = unit?.threshold ?? 1;
  const digits = Math.max(
    2,
    Math.min(12, Math.ceil(-Math.log10(quantum / divisor))),
  );
  const formatted = formatCurrency(value / divisor, currency, digits);
  return `${compactZeros(formatted)}${unit?.suffix ?? ""}`;
}

export function priceChartData(
  points: PriceHistoryPoint[],
  currency: CurrencyCode,
) {
  const domain = priceDomain(points);
  const range = domain.max - domain.min;
  // Round ticks at a precision derived from the range, preserving small movements.
  const quantum = 10 ** (Math.floor(Math.log10(range / 2)) - 1);
  const minUnits = Math.floor(domain.min / quantum);
  const stepUnits = Math.max(
    1,
    Math.ceil((Math.ceil(domain.max / quantum) - minUnits) / 2),
  );
  const min = minUnits * quantum;
  const max = (minUnits + stepUnits * 2) * quantum;
  const span = max - min;
  // Tooltip precision follows the original data range, independently of axis ticks.
  const tooltipDigits = Math.max(
    2,
    Math.min(12, Math.ceil(-Math.log10(range / 4)) + 1),
  );
  const labels = [min, min + span / 2, max].map((value) =>
    formatAxisPrice(value, currency, quantum),
  );
  // Normalise prices to avoid chart-library rounding of very small currencies.
  // Preserve the original price for tooltips and timestamps for uneven intervals.
  const data: ChartPricePoint[] = points.map(([timestamp, price]) => ({
    x: timestamp,
    value: ((price - min) / span) * 100,
    price,
  }));
  return {
    data,
    labels,
    formatPrice: (price: number) =>
      formatCurrency(price, currency, tooltipDigits),
  };
}
