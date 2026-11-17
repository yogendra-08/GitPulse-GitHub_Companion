import { KEYS, storageGet, storageRemoveByPrefix, storageSet } from './storage';

interface Entry<T> {
  at: number;
  data: T;
}

const memory = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<(entry: Entry<unknown>) => void>>();

/** Be told when any component writes a new value for `key`. Returns an unsubscribe function. */
export function cacheSubscribe<T>(key: string, cb: (entry: Entry<T>) => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(cb as (entry: Entry<unknown>) => void);
  listeners.set(key, set);
  return () => set.delete(cb as (entry: Entry<unknown>) => void);
}

const fullKey = (key: string) => KEYS.cachePrefix + key;

/** Read a cached value (memory first, then extension storage). Never throws. */
export async function cacheRead<T>(key: string): Promise<Entry<T> | undefined> {
  const hit = memory.get(key);
  if (hit) return hit as Entry<T>;
  try {
    const stored = await storageGet<Entry<T>>(fullKey(key));
    if (stored && typeof stored.at === 'number') {
      memory.set(key, stored);
      return stored;
    }
  } catch {
    /* a broken cache must never break the UI */
  }
  return undefined;
}

export function cachePeek<T>(key: string): Entry<T> | undefined {
  return memory.get(key) as Entry<T> | undefined;
}

export async function cacheWrite<T>(key: string, data: T): Promise<number> {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  listeners.get(key)?.forEach((cb) => cb(entry));
  try {
    await storageSet(fullKey(key), entry);
  } catch {
    /* quota or serialization failure: keep the in-memory copy only */
  }
  return entry.at;
}

export async function cacheClearAll(): Promise<void> {
  memory.clear();
  await storageRemoveByPrefix(KEYS.cachePrefix);
}
