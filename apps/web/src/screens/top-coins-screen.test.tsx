import { proxyError, TEST_BASE_URL } from "@crypto-markets/api/testing";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/testing/render";
import { server } from "@/testing/server";

import { TopCoinsScreen } from "./top-coins-screen";

const marketsUrl = `${TEST_BASE_URL}/coins/markets`;

// Waits for the top 10 from the markets fixture (Bitcoin, Ethereum).
async function findCoinList() {
  return screen.findByRole("list");
}

describe("TopCoinsScreen", () => {
  it("shows the top coins once loaded", async () => {
    renderWithProviders(<TopCoinsScreen />);

    expect(screen.getByRole("status").textContent).toBe("Loading prices…");
    const list = await findCoinList();
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Bitcoin")).toBeTruthy();
    expect(within(list).getByText("Ethereum")).toBeTruthy();
  });

  it("fetches a coin's details only when its row is expanded", async () => {
    // Record every path the app requests (handlers stay as they are).
    const requestedPaths: string[] = [];
    server.events.on("request:start", ({ request }) => {
      requestedPaths.push(new URL(request.url).pathname);
    });
    const { user } = renderWithProviders(<TopCoinsScreen />);
    await findCoinList();
    expect(requestedPaths).toEqual(["/coins/markets"]);

    const row = screen.getByRole("button", { name: /Bitcoin/ });
    await user.click(row);

    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(
      await screen.findByRole("link", { name: "Open Bitcoin page" }),
    ).toBeTruthy();
    expect(requestedPaths).toEqual(["/coins/markets", "/coins/bitcoin"]);
  });

  it("replaces the top 10 with search results while searching", async () => {
    const { user } = renderWithProviders(<TopCoinsScreen />);
    await findCoinList();

    await user.click(screen.getByRole("button", { name: "Search coins" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search by name or symbol" }),
      "bit",
    );

    expect(
      await screen.findByRole("heading", { name: "Search results" }),
    ).toBeTruthy();
    // The search fixture has Bitcoin only; Ethereum came from the top 10.
    const results = await screen.findByRole("list");
    expect(within(results).getAllByRole("listitem")).toHaveLength(1);
    expect(within(results).getByText("Bitcoin")).toBeTruthy();
    expect(screen.queryByText("Ethereum")).toBeNull();
  });

  it("closes search on Escape, brings back the top 10 and returns focus", async () => {
    const { user } = renderWithProviders(<TopCoinsScreen />);
    await findCoinList();

    const searchButton = screen.getByRole("button", { name: "Search coins" });
    await user.click(searchButton);
    // The field takes focus when it opens, so typing goes straight into it.
    await user.keyboard("bit");
    await screen.findByRole("heading", { name: "Search results" });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Top 10 by market cap" }),
    ).toBeTruthy();
    expect(screen.getByText("Ethereum")).toBeTruthy();
    expect(document.activeElement).toBe(searchButton);
  });

  it("keeps the list and shows a notice when a refresh fails", async () => {
    const { queryClient } = renderWithProviders(<TopCoinsScreen />);
    await findCoinList();

    server.use(http.get(marketsUrl, () => proxyError(503, "upstream_error")));
    // The web app has no refresh button: refetch as a background refresh would.
    await queryClient.refetchQueries();

    expect(await screen.findByText(/Couldn.t refresh/)).toBeTruthy();
    expect(screen.getByText("Bitcoin")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("shows an error with a working retry when there is no data", async () => {
    server.use(
      http.get(marketsUrl, () => proxyError(503, "upstream_error"), {
        once: true,
      }),
    );
    const { user } = renderWithProviders(<TopCoinsScreen />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    // The one-off failure is used up, so the retry gets the fixture.
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await findCoinList();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
