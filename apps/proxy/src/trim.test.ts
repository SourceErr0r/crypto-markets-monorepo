import { describe, expect, it } from "vitest";

import { trimToCurrency } from "./trim";

describe("trimToCurrency", () => {
  it("keeps only the requested currency in per-currency market data", () => {
    const coin = {
      id: "bitcoin",
      image: { small: "s.png", large: "l.png" },
      market_data: {
        current_price: { gbp: 1, usd: 2, eur: 3 },
        ath_date: { gbp: "2025-01-01", usd: "2025-01-02" },
        circulating_supply: 100,
        roi: { times: 2, currency: "usd", percentage: 200 },
        max_supply: null,
      },
    };

    expect(JSON.parse(trimToCurrency(JSON.stringify(coin), "gbp"))).toEqual({
      id: "bitcoin",
      // Objects outside market_data are untouched.
      image: { small: "s.png", large: "l.png" },
      market_data: {
        current_price: { gbp: 1 },
        ath_date: { gbp: "2025-01-01" },
        circulating_supply: 100,
        // Not keyed by currency, so kept as it is.
        roi: { times: 2, currency: "usd", percentage: 200 },
        max_supply: null,
      },
    });
  });

  it("keeps a null value for the currency rather than dropping the field", () => {
    const coin = { market_data: { high_24h: { gbp: null, usd: 5 } } };
    expect(JSON.parse(trimToCurrency(JSON.stringify(coin), "gbp"))).toEqual({
      market_data: { high_24h: { gbp: null } },
    });
  });

  it("returns bodies without market data unchanged", () => {
    const body = JSON.stringify({ id: "bitcoin" });
    expect(trimToCurrency(body, "gbp")).toBe(body);
  });
});
