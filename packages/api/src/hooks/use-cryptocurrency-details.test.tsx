import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError, UNKNOWN_ERROR_MESSAGE } from "../errors";
import { useCryptocurrencyDetails } from "./use-cryptocurrency-details";
import { createApiClient, type ApiClient } from "../client";
import { createWrapper } from "./test-wrapper";
import type { CryptocurrencyDetails } from "../types";

const getDetails = vi.fn<ApiClient["getCryptocurrencyDetails"]>();
const api = { ...createApiClient("https://api.test"), getCryptocurrencyDetails: getDetails };

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as CryptocurrencyDetails;

describe("useCryptocurrencyDetails", () => {
  beforeEach(() => {
    getDetails.mockReset();
  });

  it("returns the coin once it has loaded", async () => {
    getDetails.mockResolvedValue(bitcoin);
    const { result } = renderHook(() => useCryptocurrencyDetails("bitcoin", "gbp"), {
      wrapper: createWrapper(api),
    });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual(bitcoin));
    expect(getDetails).toHaveBeenCalledWith(
      "bitcoin",
      "gbp",
      expect.any(AbortSignal),
    );
  });

  it("never shows raw error messages from unexpected failures", async () => {
    getDetails.mockRejectedValue(new TypeError("undefined is not an object"));
    const { result } = renderHook(() => useCryptocurrencyDetails("bitcoin", "gbp"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() => expect(result.current.error).toBe(UNKNOWN_ERROR_MESSAGE));
  });

  it("reports the error message and clears it when retried", async () => {
    getDetails.mockRejectedValueOnce(new ApiError("Coin not found", { kind: "http", status: 404 }));
    const { result } = renderHook(() => useCryptocurrencyDetails("bitcoin", "gbp"), {
      wrapper: createWrapper(api),
    });

    await waitFor(() => expect(result.current.error).toBe("Coin not found"));
    expect(result.current.data).toBeUndefined();

    getDetails.mockResolvedValue(bitcoin);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.data).toEqual(bitcoin));
    expect(result.current.error).toBeNull();
  });
});
