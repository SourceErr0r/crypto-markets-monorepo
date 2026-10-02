// Hardcoded for simplicity, but could use `/supported_vs_currencies` to get full list
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
} as const;

export type CurrencyCode = keyof typeof currencies;

export const currencyCodes = Object.keys(currencies) as CurrencyCode[];
