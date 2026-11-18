import type { z } from "zod";

import type {
  cryptocurrencyDetailsSchema,
  cryptocurrencySchema,
  searchResultSchema,
} from "./schemas";

// Response types come from the schemas, so the types and the runtime checks
// can't drift apart.
export type Cryptocurrency = z.infer<typeof cryptocurrencySchema>;
export type CryptocurrencyDetails = z.infer<typeof cryptocurrencyDetailsSchema>;
export type CryptocurrencySearchResult = z.infer<typeof searchResultSchema>;

export type PriceHistoryPoint = [timestamp: number, price: number];
export type HistoryDays = 1 | 7 | 30;
