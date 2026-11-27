import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/testing/render";

import { CoinDetailsScreen } from "./coin-details-screen";

describe("CoinDetailsScreen", () => {
  it("shows the coin's header and price", async () => {
    renderWithProviders(<CoinDetailsScreen id="bitcoin" />);

    expect(screen.getByRole("status").textContent).toBe("Loading coin…");
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Bitcoin BTC");
    expect(screen.getByText("Rank #1")).toBeTruthy();
    expect(screen.getByText("£65,000.00")).toBeTruthy();
  });

  it("shows a not-found message with a way back, and no retry", async () => {
    // The mock proxy returns 404 for any id other than bitcoin.
    renderWithProviders(<CoinDetailsScreen id="not-a-coin" />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to top coins" }).getAttribute("href"),
    ).toBe("/");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
