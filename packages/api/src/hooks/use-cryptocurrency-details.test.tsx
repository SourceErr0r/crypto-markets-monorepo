import { act, renderHook, waitFor } from "@testing-library/react-native";

import { CoinGeckoError, UNKNOWN_ERROR_MESSAGE } from "@/api/coingecko-errors";
import {
  getCryptocurrencyDetails,
  type CryptocurrencyDetails,
} from "@/api/coingecko";
import { useCryptocurrencyDetails } from "@/hooks/use-cryptocurrency-details";
import { createQueryWrapper } from "@/test/query-wrapper";

jest.mock("@/api/coingecko");
const getDetails = jest.mocked(getCryptocurrencyDetails);

const bitcoin = { id: "bitcoin", name: "Bitcoin" } as CryptocurrencyDetails;

describe("useCryptocurrencyDetails", () => {
  beforeEach(() => getDetails.mockReset());

  it("returns the coin once it has loaded", async () => {
    getDetails.mockResolvedValue(bitcoin);
    const { result } = renderHook(() => useCryptocurrencyDetails("bitcoin", "gbp"), {
      wrapper: createQueryWrapper(),
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
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe(UNKNOWN_ERROR_MESSAGE));
  });

  it("reports the error message and clears it when retried", async () => {
    getDetails.mockRejectedValueOnce(new CoinGeckoError("Coin not found"));
    const { result } = renderHook(() => useCryptocurrencyDetails("bitcoin", "gbp"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe("Coin not found"));
    expect(result.current.data).toBeUndefined();

    getDetails.mockResolvedValue(bitcoin);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.data).toEqual(bitcoin));
    expect(result.current.error).toBeNull();
  });
});
