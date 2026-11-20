import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Toast, TOAST_VISIBLE_MS } from "@/components/toast";

const renderToast = (message: string) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Toast message={message} />
    </SafeAreaProvider>,
  );

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows the message, then removes it after a few seconds", () => {
    renderToast("Can't connect");
    expect(screen.getByText("Can't connect")).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(TOAST_VISIBLE_MS + 1000));

    expect(screen.queryByText("Can't connect")).toBeNull();
  });

  it("asks VoiceOver to read the message on iOS", () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    jest.replaceProperty(Platform, "OS", "ios");

    renderToast("Can't connect");

    expect(announce).toHaveBeenCalledWith("Can't connect");
  });
});
