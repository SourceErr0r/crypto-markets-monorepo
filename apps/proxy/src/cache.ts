// Response cache in Workers KV. The Cache API would be the usual choice, but
// it only stores responses on a custom domain, not on *.workers.dev.
//
// Entries are kept much longer than they are fresh. Freshness (the route's TTL)
// is checked against `fetchedAt`; the extra lifetime is only so a stale copy
// can be served when CoinGecko is failing.

const KEEP_FOR_SECONDS = 24 * 60 * 60;

type CacheMetadata = { fetchedAt: number };

export type CachedResponse = { body: string; ageSeconds: number };

export async function readCache(kv: KVNamespace, key: string): Promise<CachedResponse | null> {
  try {
    const { value, metadata } = await kv.getWithMetadata<CacheMetadata>(key, "text");
    if (value === null || !metadata) return null;
    const ageSeconds = Math.max(Math.floor((Date.now() - metadata.fetchedAt) / 1000), 0);
    return { body: value, ageSeconds };
  } catch (error) {
    // Treated as a miss: the request still works, it just costs an upstream call.
    console.error("Cache read failed", key, error);
    return null;
  }
}

export async function writeCache(kv: KVNamespace, key: string, body: string): Promise<void> {
  try {
    const metadata: CacheMetadata = { fetchedAt: Date.now() };
    await kv.put(key, body, { expirationTtl: KEEP_FOR_SECONDS, metadata });
  } catch (error) {
    // KV allows one write per key per second, so two simultaneous misses for
    // the same key can make one write fail. The response was already served.
    console.error("Cache write failed", key, error);
  }
}
