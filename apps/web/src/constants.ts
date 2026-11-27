import type { CurrencyCode } from "@crypto-markets/api";

// The web app shows one currency (mobile's default). A currency switcher is
// out of scope for the minimal web version.
export const CURRENCY: CurrencyCode = "gbp";

// Fixed rather than taken from the browser, so formatting matches mobile.
export const LOCALE = "en-GB";
