import { CURRENCY_CODES, type CurrencyCode } from "@crypto-markets/api";

export type { CurrencyCode };

// Display details for each currency the API accepts. Hardcoded for
// simplicity, but could use `/supported_vs_currencies` to get the full list.
export const currencies = {
  gbp: {
    code: "GBP",
    label: "British Pound",
    symbol: "£",
  },
  usd: {
    code: "USD",
    label: "US Dollar",
    symbol: "$",
  },
  eur: {
    code: "EUR",
    label: "Euro",
    symbol: "€",
  },
} as const satisfies Record<
  CurrencyCode,
  { code: string; label: string; symbol: string }
>;

export const currencyCodes: readonly CurrencyCode[] = CURRENCY_CODES;
