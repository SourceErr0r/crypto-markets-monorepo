import { act, render, screen } from "@testing-library/react-native";

import { UpdatedLabel } from "@/components/updated-label";

describe("UpdatedLabel", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-11-19T14:05:30Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps the age current while it stays on screen", () => {
    render(<UpdatedLabel updatedAt={Date.parse("2026-11-19T14:05:00Z")} />);
    expect(screen.getByText("Updated just now")).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(60 * 1000));

    expect(screen.getByText("Updated 1 min ago")).toBeOnTheScreen();
  });
});
