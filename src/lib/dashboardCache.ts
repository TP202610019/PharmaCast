interface CacheEntry<T> {
  data: T;
  ts: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_STALE_MS = 5 * 60 * 1000;

export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs: number = DEFAULT_STALE_MS
): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.ts < staleMs) return Promise.resolve(hit.data);
  return fetcher().then((data) => {
    store.set(key, { data, ts: Date.now() });
    return data;
  });
}

export function invalidateDashboardCache(): void {
  store.clear();
}
