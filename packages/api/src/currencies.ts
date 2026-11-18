// The currencies the API proxy accepts as `vs_currency`. Apps add their own
// display details (labels, symbols) for each.
export const CURRENCY_CODES = ["gbp", "usd", "eur"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];
