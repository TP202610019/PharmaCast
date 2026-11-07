interface StoredEntry { id: string; scope: string; key: string; ts: number; data: unknown }
const SESSION_KEY = "pharmacast_analysis_cache_session";
const MAX_AGE = 10 * 60_000;
let database: Promise<IDBDatabase | null> | undefined;

function scope(): string | null {
  try {
    if (typeof indexedDB === "undefined" || localStorage.getItem("pharmacast_auth") !== "true") return null;
    const user = JSON.parse(localStorage.getItem("pharmacast_user") ?? "null");
    if (!user?.id) return null;
    let session = sessionStorage.getItem(SESSION_KEY);
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, session); }
    return `${user.id}:${session}`;
  } catch { return null; }
}

function open(): Promise<IDBDatabase | null> {
  if (!database) database = new Promise(resolve => {
    try {
      const request = indexedDB.open("pharmacast-analysis-cache", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("entries", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return database;
}

function eligible(key: string): boolean {
  return ["prediction:", "prediction-summary:", "plan:", "chart:"].some(prefix => key.startsWith(prefix)) ||
    ["history", "summary", "metrics"].includes(key);
}

export async function readPersistedAnalysis<T>(key: string): Promise<{ data: T; ts: number } | undefined> {
  const owner = scope();
  if (!owner || !eligible(key)) return;
  // An unavailable browser database must never hold up normal API loading.
  return Promise.race([
    (async () => {
      const db = await open();
      if (!db) return;
      return new Promise<{ data: T; ts: number } | undefined>(resolve => {
        try {
          const request = db.transaction("entries", "readonly").objectStore("entries").get(`${owner}:${key}`);
          request.onsuccess = () => {
            const value = request.result as StoredEntry | undefined;
            resolve(scope() === owner && value && Date.now() - value.ts < MAX_AGE ? { data: value.data as T, ts: value.ts } : undefined);
          };
          request.onerror = () => resolve(undefined);
        } catch { resolve(undefined); }
      });
    })(),
    new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 1000)),
  ]);
}

export function persistAnalysis<T>(key: string, entry: { data: T; ts: number }): void {
  const owner = scope();
  if (!owner || !eligible(key)) return;
  void open().then(db => {
    if (!db || owner !== scope()) return;
    try {
      const tx = db.transaction("entries", "readwrite");
      tx.onerror = () => {}; // Quota/privacy restrictions fall back to memory caching.
      const entries = tx.objectStore("entries");
      entries.put({ id: `${owner}:${key}`, scope: owner, key, ...entry });
      const request = entries.getAll();
      request.onsuccess = () => {
        const rows = request.result as StoredEntry[];
        for (const row of rows) if (row.scope !== owner || Date.now() - row.ts >= MAX_AGE) entries.delete(row.id);
        for (const [prefix, limit] of [["prediction:", 3], ["chart:", 16], ["plan:", 5], ["prediction-summary:", 10]] as const) {
          const family = rows.filter(row => row.scope === owner && row.key.startsWith(prefix)).sort((a, b) => b.ts - a.ts);
          for (const old of family.slice(limit)) entries.delete(old.id);
        }
      };
    } catch { /* Browser caching is optional. */ }
  });
}

export function clearPersistedAnalysis(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  if (typeof indexedDB === "undefined") return;
  void open().then(db => {
    try { db?.transaction("entries", "readwrite").objectStore("entries").clear(); } catch {}
  });
}

export function invalidatePersistedLists(): void {
  const owner = scope();
  if (!owner) return;
  void open().then(db => {
    if (!db) return;
    try {
      const entries = db.transaction("entries", "readwrite").objectStore("entries");
      const request = entries.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const row = cursor.value as StoredEntry;
        if (row.scope === owner && (["metrics", "summary", "history"].includes(row.key) || row.key.startsWith("prediction-summary:"))) cursor.delete();
        cursor.continue();
      };
    } catch {}
  });
}
