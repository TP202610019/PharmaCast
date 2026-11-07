interface CacheEntry<T> { data: T; ts: number }
const store = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const revisions = new Map<string, number>();
let generation = 0;
const DEFAULT_STALE_MS = 60_000;

export function peekCache<T>(key: string): T | undefined {
  return (store.get(key) as CacheEntry<T> | undefined)?.data;
}

export function withCache<T>(key: string, fetcher: () => Promise<T>, staleMs = DEFAULT_STALE_MS): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.ts < staleMs) return Promise.resolve(hit.data);
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const started = generation;
  const revision = revisions.get(key) ?? 0;
  const request = fetcher().then(data => {
    if (generation === started && (revisions.get(key) ?? 0) === revision) seedCache(key, data);
    return data;
  }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
}

export function invalidateDashboardCache(): void {
  generation++;
  store.clear();
  pending.clear();
  revisions.clear();
}

export function seedCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
  const family = key.startsWith("prediction:") ? "prediction:" : key.startsWith("chart:") ? "chart:" : null;
  const limit = family === "prediction:" ? 5 : 60;
  const keys = [...store.keys()].filter(value => !family || value.startsWith(family));
  for (const old of keys.slice(0, Math.max(0, keys.length - limit))) store.delete(old);
}
export function invalidateAnalysisLists(): void {
  for (const key of new Set([...store.keys(), ...pending.keys()])) {
    if (key === "metrics" || key === "summary" || key === "history" || key.startsWith("prediction-summary:")) {
      store.delete(key);
      pending.delete(key);
      revisions.set(key, (revisions.get(key) ?? 0) + 1);
    }
  }
}
