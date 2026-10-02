import { getTopCryptocurrencies } from '@/api/coingecko';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as typeof fetch;
});

describe('getTopCryptocurrencies', () => {
  it('requests the top ten coins in the selected currency', async () => {
    const cryptocurrencies = [{ id: 'bitcoin', name: 'Bitcoin' }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(cryptocurrencies),
    });

    await expect(getTopCryptocurrencies('gbp')).resolves.toEqual(cryptocurrencies);

    const [url] = fetchMock.mock.calls[0] as [string];
    const searchParams = new URL(url).searchParams;

    expect(url).toContain('/coins/markets');
    expect(searchParams.get('vs_currency')).toBe('gbp');
    expect(searchParams.get('order')).toBe('market_cap_desc');
    expect(searchParams.get('per_page')).toBe('10');
    expect(searchParams.get('page')).toBe('1');
  });

  it('surfaces CoinGecko error messages', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        status: { error_message: 'Rate limit exceeded' },
      }),
    });

    await expect(getTopCryptocurrencies('usd')).rejects.toThrow(
      'Rate limit exceeded',
    );
  });
});
