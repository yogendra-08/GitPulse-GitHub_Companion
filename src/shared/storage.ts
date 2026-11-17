/**
 * Thin promise wrapper over chrome.storage.local with a localStorage fallback so
 * the UI can also run under `vite dev` and in unit tests.
 */

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

export const KEYS = {
  auth: 'gp:auth',
  settings: 'gp:settings',
  cachePrefix: 'gp:cache:',
  badge: 'gp:badge',
  seen: 'gp:seen',
  lastModified: 'gp:notif-last-modified',
} as const;

export async function storageGet<T>(key: string): Promise<T | undefined> {
  if (hasChromeStorage()) {
    const out = await chrome.storage.local.get(key);
    return out[key] as T | undefined;
  }
  const raw = globalThis.localStorage?.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

export async function storageRemove(...keys: string[]): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.remove(keys);
    return;
  }
  keys.forEach((k) => globalThis.localStorage?.removeItem(k));
}

/** Remove every key that starts with `prefix`. */
export async function storageRemoveByPrefix(prefix: string): Promise<void> {
  if (hasChromeStorage()) {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith(prefix));
    if (keys.length) await chrome.storage.local.remove(keys);
    return;
  }
  const ls = globalThis.localStorage;
  if (!ls) return;
  Object.keys(ls)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => ls.removeItem(k));
}

type ChangeHandler = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void;

/** Subscribe to storage changes made by any extension context. Returns an unsubscribe function. */
export function onStorageChange(handler: ChangeHandler): () => void {
  if (hasChromeStorage() && chrome.storage.onChanged) {
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area === 'local') handler(changes);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
  if (typeof window === 'undefined') return () => undefined;
  const listener = (e: StorageEvent) => {
    if (e.key) handler({ [e.key]: { newValue: e.newValue ? JSON.parse(e.newValue) : undefined } });
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
